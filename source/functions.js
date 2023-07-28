const fetch = require("axios");

async function getChainInfo(projectName) {
  const url = `https://chains.cosmos.directory/${projectName}`;
  try {
    const req = await fetch(url);
    return req.data.chain;
  } catch (e) {
    console.log("ERROR CONNECTING COSMOS REGISTRY: ", e.code, e.config.url);
    return false;
  }
}

async function getValidatorMissedBlocksBy(consensusAddress, api) {
  const url = `${api}/cosmos/slashing/v1beta1/signing_infos/${consensusAddress}`;
  const req = await fetch(url);
  return req.data.val_signing_info.missed_blocks_counter * 1; // make it a number
}

async function getChainSlashingParams(api) {
  const url = `${api}/cosmos/slashing/v1beta1/params`;
  const req = await fetch(url);
  const params = req.data.params;
  return {
    signed_blocks_window: params.signed_blocks_window * 1,
    min_signed_per_window: params.min_signed_per_window * 1,
  };
}

async function getBalance({ walletAddress, denom }, api) {
  if (!walletAddress || !denom || !api) return false;

  const url = `${api}/cosmos/bank/v1beta1/balances/${walletAddress}`;
  const req = await fetch(url);
  return req.data.balances.find((a) => a.denom == denom).amount;
}

async function getFilteredBalance({ walletAddress, denom, exponent }, api) {
  const balance = await getBalance({ walletAddress, denom }, api);
  return parseInt(balance / Math.pow(10, exponent));
}

async function getValidatorCommission({ operatorAddress, denom }, api) {
  const url = `${api}/cosmos/distribution/v1beta1/validators/${operatorAddress}/commission`;
  const req = await fetch(url);
  return req.data.commission.commission.find(
    (commission) => commission.denom == denom
  ).amount;
}

async function getFilteredValidatorCommission(
  { operatorAddress, exponent, denom },
  api
) {
  const commission = await getValidatorCommission(
    { operatorAddress, denom },
    api
  );
  return parseInt(commission / Math.pow(10, exponent));
}

async function getValidatorRewards(walletAddress, api) {
  const url = `${api}/cosmos/distribution/v1beta1/delegators/${walletAddress}/rewards`;
  const req = await fetch(url);
  return req.data.rewards.reduce(
    (acc, validator) =>
      validator.reward.length === 0
        ? acc
        : acc + validator.reward[0].amount * 1,

    0
  );
}

async function getFilteredValidatorRewards({ walletAddress, exponent }, api) {
  const rewards = await getValidatorRewards(walletAddress, api);
  return parseInt(rewards / Math.pow(10, exponent));
}

module.exports = {
  getValidatorMissedBlocksBy,
  getChainSlashingParams,
  getChainInfo,
  getFilteredBalance,
  getFilteredValidatorRewards,
  getFilteredValidatorCommission,
};
