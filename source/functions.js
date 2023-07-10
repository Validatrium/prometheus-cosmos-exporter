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
    signed_blocks_window: params.signed_blocks_window*1,
    min_signed_per_window: params.min_signed_per_window*1,
  };
}

module.exports = { getValidatorMissedBlocksBy, getChainSlashingParams };
