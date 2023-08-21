const fetch = require("axios");

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

async function getValidatorRewards({ walletAddress, denom }, api) {
  const url = `${api}/cosmos/distribution/v1beta1/delegators/${walletAddress}/rewards`;
  const req = await fetch(url);
  return req.data.total.reduce(
    (acc, reward) =>
      reward.denom == denom ? (acc += reward.amount * 1) : false,
    0
  );
}

async function getFilteredValidatorRewards(
  { walletAddress, exponent, denom },
  api
) {
  const rewards = await getValidatorRewards({ walletAddress, denom }, api);
  return parseInt(rewards / Math.pow(10, exponent));
}

async function getLatestBlockTime(api) {
  const req = await fetch(
    `${api}/cosmos/base/tendermint/v1beta1/blocks/latest`
  );
  const date = new Date(req.data.block.header.time);
  return date.getTime();
}

async function getValidatorBond({ operatorAddress, exponent }, api) {
  const url = `${api}/cosmos/staking/v1beta1/validators/${operatorAddress}`;
  const req = await fetch(url);
  return parseInt(req.data.validator.tokens / Math.pow(10, exponent));
}

async function getNetworkMaxValidatorsCount(api) {
  const req = await fetch(`${api}/cosmos/staking/v1beta1/params`);
  return req.data.params.max_validators;
}

async function getValidatorIsActive(operatorAddress, api) {
  const url = `${api}/cosmos/staking/v1beta1/validators/${operatorAddress}`;
  const req = await fetch(url);
  return req.data.validator.status == "BOND_STATUS_BONDED" ? 1 : 0;
}
async function getValidatorIsJailed(operatorAddress, api) {
  const url = `${api}/cosmos/staking/v1beta1/validators/${operatorAddress}`;
  const req = await fetch(url);
  return req.data.validator.jailed == false ? 0 : 1;
}

async function getValidatorRankByOperatorAddress(operatorAddress, api) {
  if ((await getValidatorIsActive(operatorAddress, api)) == 0) return 0;

  const req = await fetch(
    `${api}/cosmos/staking/v1beta1/validators?status=BOND_STATUS_BONDED&pagination.limit=400`
  );
  const activeValidators = req.data.validators;
  const sortedByTokens = activeValidators.sort((a, b) => b.tokens - a.tokens);
  const index = sortedByTokens.findIndex(
    (val) => val.operator_address == operatorAddress
  );
  return index + 1;
}

module.exports = {
  getValidatorMissedBlocksBy,
  getChainSlashingParams,
  getFilteredBalance,
  getFilteredValidatorRewards,
  getFilteredValidatorCommission,
  getLatestBlockTime,
  getValidatorBond,
  getNetworkMaxValidatorsCount,
  getValidatorRankByOperatorAddress,
  getValidatorIsActive,
  getValidatorIsJailed,
};
