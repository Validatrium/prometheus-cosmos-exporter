const express = require("express");
const Prometheus = require("prom-client");
const fetch = require("axios");
const app = express();
const {
  getValidatorMissedBlocksBy,
  getChainSlashingParams,
  getFilteredBalance,
  getFilteredValidatorCommission,
  getFilteredValidatorRewards,
} = require("./functions");

function clearMetrics() {
  register.removeSingleMetric(validator_missed_blocks_counter);
  register.removeSingleMetric(chain_signed_blocks_window);
  register.removeSingleMetric(chain_min_signed_per_window);
  register.removeSingleMetric(validator_wallet_balance_filtered);
  register.removeSingleMetric(validator_available_rewards_filtered);
  register.removeSingleMetric(validator_available_commission_filtered);
}

async function getMetrics() {
  const validatorMissedBlocks = await getValidatorMissedBlocksBy(
    _settings.consensusAddress,
    _settings.api
  );

  const networkSlashingParams = await getChainSlashingParams(_settings.api);

  const validatorBalance = await getFilteredBalance(
    {
      walletAddress: _settings.walletAddress,
      denom: _settings.denom,
      exponent: _settings.exponent,
    },
    _settings.api
  );

  const validatorCommission = await getFilteredValidatorCommission(
    {
      operatorAddress: _settings.operatorAddress,
      exponent: _settings.exponent,
      denom: _settings.denom,
    },
    _settings.api
  );

  const validatorRewards = await getFilteredValidatorRewards(
    {
      walletAddress: _settings.walletAddress,
      exponent: _settings.exponent,
      denom: _settings.denom
    },
    _settings.api
  );

  validator_missed_blocks_counter
    .labels(_settings.consensusAddress)
    .set(validatorMissedBlocks);
  chain_signed_blocks_window
    .labels({})
    .set(networkSlashingParams.signed_blocks_window);
  chain_min_signed_per_window
    .labels({})
    .set(networkSlashingParams.min_signed_per_window);

  validator_wallet_balance_filtered
    .labels(_settings.walletAddress)
    .set(validatorBalance);
  validator_available_commission_filtered
    .labels(_settings.operatorAddress)
    .set(validatorCommission);
  validator_available_rewards_filtered
    .labels(_settings.walletAddress)
    .set(validatorRewards);
}

const _settings = {
  port: process.argv[2] || 4000,
  chain: process.argv[3],
  api: process.argv[4],
  operatorAddress: process.argv[5],
  walletAddress: process.argv[6],
  consensusAddress: process.argv[7],
  projectName: process.argv[8],
  friendlyName: process.argv[9],
  networkType: process.argv[10] || "mainnet",
  denom: process.argv[11],
  exponent: process.argv[12] || 6,
};

const register = new Prometheus.Registry();
register.setDefaultLabels({
  chain: _settings.chain,
  port: _settings.port,
  projectName: _settings.projectName,
  friendlyName: _settings.friendlyName,
  networkType: _settings.networkType,
});
Prometheus.collectDefaultMetrics({ register });

const validator_missed_blocks_counter = new Prometheus.Gauge({
  name: "validator_missed_blocks_counter",
  help: "count validator missed blocks",
  labelNames: ["consensusAddress"],
});
register.registerMetric(validator_missed_blocks_counter);

const chain_signed_blocks_window = new Prometheus.Gauge({
  name: "chain_signed_blocks_window",
  help: "show chain settings signed blocks window",
  labelNames: ["chain"],
});
register.registerMetric(chain_signed_blocks_window);

const chain_min_signed_per_window = new Prometheus.Gauge({
  name: "chain_min_signed_per_window",
  help: "show chain settings min signed blocks percetage window ",
  labelNames: ["chain"],
});
register.registerMetric(chain_min_signed_per_window);

const validator_wallet_balance_filtered = new Prometheus.Gauge({
  name: "validator_wallet_balance_filtered",
  help: "Show wallet balance as native coin. Withouth exponent",
  labelNames: ["walletAddress"],
});
register.registerMetric(validator_wallet_balance_filtered);

const validator_available_commission_filtered = new Prometheus.Gauge({
  name: "validator_available_commission_filtered",
  help: "Show available commission. Withouth exponent",
  labelNames: ["operatorAddress"],
});
register.registerMetric(validator_available_commission_filtered);

const validator_available_rewards_filtered = new Prometheus.Gauge({
  name: "validator_available_rewards_filtered",
  help: "Show available rewards. Withouth exponent",
  labelNames: ["walletAddress"],
});
register.registerMetric(validator_available_rewards_filtered);

app.get("/metrics", async function (req, res) {
  // CLEAR METRICS
  clearMetrics();
  // COLLECT METRICS
  getMetrics();
  // SEND METRICS
  res.setHeader("Content-Type", register.contentType);
  register.metrics().then((data) => res.status(200).send(data));
});

const onStart = (async () => {
  try {
    const url = `${_settings.api}//cosmos/auth/v1beta1/params`;
    const req = await fetch(url);
  } catch (err) {
    if (err.errno == -3008) {
      console.log("Unable to connect to api server. Exiting...");
      process.exit(1);
    }
    console.log(
      `API server response: ${err.response.status} for link: ${err.config.url}`
    );
    console.log(`Unable to use API server. Exiting...`);
    process.exit(1);
  }
})();

app.listen(_settings.port, () => {
  console.log(`========Exporter started on port: ${_settings.port}========`);
});
