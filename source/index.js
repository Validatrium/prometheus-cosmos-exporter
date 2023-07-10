const express = require("express");
const Prometheus = require("prom-client");
const app = express();
const {
  getValidatorMissedBlocksBy,
  getChainSlashingParams,
} = require("./functions");

function clearMetrics() {
  register.removeSingleMetric(validator_missed_blocks_counter);
  register.removeSingleMetric(chain_signed_blocks_window);
  register.removeSingleMetric(chain_min_signed_per_window);
}

async function getMetrics() {
  const validatorMissedBlocks = await getValidatorMissedBlocksBy(
    _settings.consensusAddress,
    _settings.api
  );

  const networkSlashingParams = await getChainSlashingParams( _settings.api )


  validator_missed_blocks_counter
    .labels(_settings.consensusAddress)
    .set(validatorMissedBlocks);
  chain_signed_blocks_window.labels({}).set(networkSlashingParams.signed_blocks_window);
  chain_min_signed_per_window.labels({}).set(networkSlashingParams.min_signed_per_window);
}

const _settings = {
  port: process.argv[2],
  chain: process.argv[3],
  api: process.argv[4],
  operatorAddress: process.argv[5],
  walletAddress: process.argv[6],
  consensusAddress: process.argv[7],
  name: process.argv[7],
  networkType: process.argv[8],
  friendlyName: process.argv[9],
};

const register = new Prometheus.Registry();
register.setDefaultLabels({
  chain: _settings.chain,
  port: _settings.port,
  name: _settings.name,
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

app.get("/metrics", async function (req, res) {
  // CLEAR METRICS
  clearMetrics();
  // COLLECT METRICS
  getMetrics();
  // SEND METRICS
  res.setHeader("Content-Type", register.contentType);
  register.metrics().then((data) => res.status(200).send(data));
});

// const getValConAddressBy =  async  valoper  => {
// 	const url = '/validatorsets/latest'
// 	const res = await fetch(`${API}${url}`)

// 	//const pubKey = await res.data.validator.consensus_pubkey.key
// 	const arr = res.data.result.validators

// 	const a = arr.find( el =>
// 		el.address == 'archwayvalcons1pdpl3p5wu70qw5zuje99nnw3qd035ecuvcj4gq'
// 	)

// 	console.log( a )

// 	//const req = await fetch(`${API}/cosmos/slashing/v1beta1/signing_infos`)
// 	//console.log( req )
// }
// getValConAddressBy(VALOPER)

// const missedBlocksCounter = async() => {
// 	//const address='archwayvalcons1anh88k26wljp5jkrzjxht0n6avpvc9rax2red0'
// 	//const url1='/cosmos/slashing/v1beta1/signing_infos/'
// 	//const a = await fetch(`${API}${url1}${address}`)
// 	//console.log( a.data.val_signing_info.missed_blocks_counter )

// 	const a = await fetch(`${RPC}/status`)
// 	return a.data.result.sync_info.latest_block_height*1
// }
// //missedBlocksCounter()

// app.get('/', (req, res) => {
//   res.send(collectDefaultMetrics())
// })

app.listen(_settings.port, () => {
  console.log(`Example app listening on port ${_settings.port}`);
});
