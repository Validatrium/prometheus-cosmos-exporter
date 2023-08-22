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
  getLatestBlockTime,
  getValidatorBond,
  getNetworkMaxValidatorsCount,
  getValidatorRankByOperatorAddress,
  getValidatorIsActive,
  getValidatorIsJailed,
  getAddressVotes,
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
  const networkLatestBlockTime = await getLatestBlockTime(_settings.api);
  const networkMaxValidatorsCount = await getNetworkMaxValidatorsCount(
    _settings.api
  );

  const validatorBalance = await getFilteredBalance(
    {
      walletAddress: _settings.walletAddress,
      denom: _settings.denom,
      exponent: _settings.exponent,
    },
    _settings.api
  );
  const validatorRewards = await getFilteredValidatorRewards(
    {
      walletAddress: _settings.walletAddress,
      exponent: _settings.exponent,
      denom: _settings.denom,
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

  const validatorBond = await getValidatorBond(
    {
      operatorAddress: _settings.operatorAddress,
      exponent: _settings.exponent,
    },
    _settings.api
  );
  const validatorIsActive = await getValidatorIsActive(
    _settings.operatorAddress,
    _settings.api
  );

  const validatorIsJailed = await getValidatorIsJailed(
    _settings.operatorAddress,
    _settings.api
  );

  const validatorRank = await getValidatorRankByOperatorAddress(
    _settings.operatorAddress,
    _settings.api
  );

  const addressVotes = await getAddressVotes(
    _settings.walletAddress,
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

  network_latest_block_time.labels({}).set(networkLatestBlockTime);

  network_max_validators.labels({}).set(networkMaxValidatorsCount);
  validator_is_active.labels(_settings.operatorAddress).set(validatorIsActive);
  validator_is_jailed.labels(_settings.operatorAddress).set(validatorIsJailed);
  validator_rank.labels(_settings.operatorAddress).set(validatorRank);
  validator_bond.labels(_settings.operatorAddress).set(validatorBond);

  addressVotes.forEach((prop) => {
    const {
      proposal_id,
      title,
      status,
      voting_start_time,
      voting_end_time,
      answer,
    } = prop;
    validator_vote_on_proposal
      .labels(
        _settings.walletAddress,
        title,
        status,
        voting_start_time,
        voting_end_time,
        answer
      )
      .set(proposal_id * 1);
  });
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

const network_latest_block_time = new Prometheus.Gauge({
  name: "network_latest_block_time",
  help: "Show timestamp when the latest block was signed",
  labelNames: [],
});
register.registerMetric(network_latest_block_time);

const validator_is_active = new Prometheus.Gauge({
  name: "validator_is_active",
  help: "Show if the validator is active",
  labelNames: ["operatorAddress"],
});
register.registerMetric(validator_is_active);

const validator_is_jailed = new Prometheus.Gauge({
  name: "validator_is_jailed",
  help: "Show if the validator is jailed",
  labelNames: ["operatorAddress"],
});
register.registerMetric(validator_is_jailed);
const validator_bond = new Prometheus.Gauge({
  name: "validator_bond",
  help: "show total staked tokens on validator",
  labelNames: ["operatorAddress"],
});
register.registerMetric(validator_bond);
const network_max_validators = new Prometheus.Gauge({
  name: "network_max_validators",
  help: "show max validators from network params",
  labelNames: [],
});
register.registerMetric(network_max_validators);
const validator_rank = new Prometheus.Gauge({
  name: "validator_rank",
  help: "show current validator rank",
  labelNames: ["operatorAddress"],
});
register.registerMetric(validator_rank);

const validator_vote_on_proposal = new Prometheus.Gauge({
  name: "validator_vote_on_proposal",
  help: "show proposal id and validator answer",
  labelNames: [
    "walletAddress",
    "title",
    "status",
    "voting_start_time",
    "voting_end_time",
    "answer",
  ],
});
register.registerMetric(validator_vote_on_proposal);

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
