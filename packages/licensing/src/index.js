import Web3 from 'web3';
// import Truffle from 'truffle-contract';
import OracleContracts from 'ujo-contracts-oracle';
import LicensingContracts from '../../contracts/licensing/build/contracts/ETHUSDHandler.json';
import TestOracleContracts from '../../contracts/licensing/build/contracts/TestOracle.json';

/**
 * Initialize Licensing
 *
 * @param {Object} ujoConfig contains network configuration and optional propertiess
 */
export default async function initializeLicensing(ujoConfig, opts = {}) {
  const web3 = ujoConfig.getWeb3();
  const web3Provider = web3.currentProvider;

  const LicensingHandler = new web3.eth.Contract(LicensingContracts.abi, '0xFcb0e327292C9AEe9b29685AF8B2A06626C5c274');

  let Oracle;
  if (opts.test) {
    Oracle = new web3.eth.Contract(TestOracleContracts.abi, '0x9f8e882071bc29313E4C403720EB0EF04aB85013');
  } else {
    Oracle = new web3.eth.Contract(OracleContracts.USDETHOracle, '');
  }

  try {
    await LicensingHandler.setProvider(web3Provider);
  } catch (error) {
    console.log('Error connecting to licensing contract', error);
  }
  // TODO: Move to seperate oracle module
  try {
    await Oracle.setProvider(web3Provider);
  } catch (error) {
    console.log('Error connecting to oracle contract', error);
  }

  /**
   * Adds a 5% boost to the gas for web3 calls as to ensure tx's go through
   *
   * @param {string} gasRequired amount of gas required from `estimateGas`
   */
  const boostGas = gasRequired => {
    const { BN } = Web3.utils;
    const gasBoost = new BN(gasRequired, 10).divRound(new BN('20'));
    return new BN(gasRequired, 10).add(gasBoost);
  };

  return {
    getExchangeRate: async () => {
      const exchangeRate = await Oracle.methods.getUintPrice().call();
      return exchangeRate.toString(10);
    },
    License: async (cid, oracle, buyer, beneficiaries, amounts, notifiers, eth) => {
      console.log('License');

      let wei;
      if (eth) {
        wei = web3.utils.toWei(eth, 'ether');
      }

      if (eth) {
        wei = web3.utils.toWei(eth, 'ether');
      }

      // Convert ether amounts to wei
      const amountsInWei = amounts.map(amount => web3.utils.toWei(amount, 'ether'));

      console.log('++++++++++');
      console.log(LicensingHandler.methods);
      console.log(Oracle.address);
      console.log('++++++++++');

      const gasRequired = await LicensingHandler.methods
        .pay(
          cid,
          oracle, // which oracle to use for reference
          buyer, // address
          beneficiaries, // addresses
          amountsInWei, // in wei
          notifiers, // contract notifiers [none in this case]
        )
        .estimateGas({
          from: buyer,
          value: wei,
        });

      const gas = boostGas(gasRequired);

      return LicensingHandler.methods.pay(cid, oracle, buyer, beneficiaries, amountsInWei, []).send({
        from: buyer,
        value: wei,
        gas,
      });
    },
  };
}
