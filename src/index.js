import {Buffer} from "buffer"
import * as CardanoWasm from "@emurgo/cardano-serialization-lib-asmjs/cardano_serialization_lib";
import axios from "axios";

window.WalletLink = (function() {
  let instance;
  let wallets = [];
  let EnabledWallet = undefined;
  /*
  * Polls and stores all active cardano wallets that exist in the users browser
  * @Returns {void}
  */
  function pollAllWallets() {
    if (window?.cardano?.nami)
      wallets.push(window.cardano.nami);
    if (window?.cardano?.eternl)
      wallets.push(window.cardano.eternl);
    if (window?.cardano?.flint)
      wallets.push(window.cardano.flint);
    if (window?.cardano?.yoroi)
      wallets.push(window.cardano.yoroi);
    if (window?.cardano?.gerowallet)
      wallets.push(window.cardano.gerowallet);
    if (window?.cardano?.nufi);
      wallets.push(window.cardano.nufi);
  }
  /*
  * Returns the wallet api object of a given wallet
  * @param wallet
  * @Returns {Promise<WalletAPI>} Promise of a wallet API object.
  */
  async function enableWallet(wallet) {
    return await wallet.enable();
  }
  /*
  * Prompts the user to sign data with wallet password
  * @param {string} data to be signed by user.
  * @Returns {Promise<*> Promise object containing the signed data.
  */
  async function enabledWalletSignData(data) {
    if (EnabledWallet) {
      const hexAddresses = await EnabledWallet.api.getUsedAddresses();
      const dataToSign = toHex(data);
      const signedData = await EnabledWallet.api.signData(hexAddresses[0], dataToSign);
      return signedData;
    }
  }
  /* Transactions --------------------*/
  /*
  * Create, sign, and submit transaction of a given amount to a given address from the currently enabled address
  * @param {String} Recipient address to be sent ada amount.
  * @param {String} Amount to be sent to the address.
  * @Returns {Promise<String>} Promise of the newly created transaction hash.
  */
  async function sendAdaTransaction(recipientAddressStr, amount) {
    
    // Fetch network parameters...
    let networkParameters = await getNetworkParameters();
    
    // Get utxos from currently enabled wallet... 
    let utxos = await getEnabledWalletUTXOs();

    // Create two addresses one for the recipient and one to receive any amount leftover...
    const changeAddress = CardanoWasm.Address.from_bech32(await getWalletAddress());
    const recipientAddress = CardanoWasm.Address.from_bech32(recipientAddressStr);

    // Init transaction...
    let txBuilder = await initTransactionBuilder(networkParameters);

    // Create transaction output with the recipient plus the desired ada amount...
    txBuilder.add_output(
      CardanoWasm.TransactionOutput.new(
        recipientAddress,
        CardanoWasm.Value.new(CardanoWasm.BigNum.from_str(amount))
      )
    );
    
    // Create transaction outputs from the enabled wallet UTXOs...
    let txOutputs = CardanoWasm.TransactionUnspentOutputs.new();
    for (const utxo of utxos) {
      txOutputs.add(utxo.TransactionUnspentOutput);
    }

    // Add the transaction outputs as the inputs for this transaction...
    txBuilder.add_inputs_from(txOutputs, 1);

    // Add change address if there any ada left over after calculating min fee...
    txBuilder.add_change_if_needed(changeAddress);

    // Build transaction body...
    const txBody = txBuilder.build();

    // Create witness for transaction...
    const transactionWitnessSet = CardanoWasm.TransactionWitnessSet.new();

    // Create transaction with transaction body and witness data...
    const tx = CardanoWasm.Transaction.new(
      txBody,
      CardanoWasm.TransactionWitnessSet.from_bytes(transactionWitnessSet.to_bytes())
    );

    // Prompt the user to sign transaction and return witness using private key...
    let txVkeyWitnesses = await EnabledWallet.api.signTx(Buffer.from(tx.to_bytes(), 'utf8').toString('hex'), true);

    // convert recently created witness data into a transaction witness object...
    txVkeyWitnesses = CardanoWasm.TransactionWitnessSet.from_bytes(Buffer.from(txVkeyWitnesses, 'hex'));

    // Append keys to transaction witness set object...
    transactionWitnessSet.set_vkeys(txVkeyWitnesses.vkeys());

    // Create new transaction with the transaction body created earlier...
    // And the newest witnesses...
    const signedTx = CardanoWasm.Transaction.new(
      tx.body(),
      transactionWitnessSet
    );

    // Submit the transaction...
    const submittedTxHash = await EnabledWallet.api.submitTx(Buffer.from(signedTx.to_bytes(), 'utf8').toString('hex'));
    return submittedTxHash;
  }

  /* Auxiliary Funcs --------------------*/
  /*
  * Returns the utxos in currrently enabled wallet
  * @returns {Promise<Array>} Promise of Array of utxos in currrently enabled wallet.
  */
  async function getEnabledWalletUTXOs() {
    let UTXOs = [];
    const rawUTXOs = await EnabledWallet.api.getUtxos();

    for (const rawUTXO of rawUTXOs) {
      const utxo = CardanoWasm.TransactionUnspentOutput.from_bytes(Buffer.from(rawUTXO, 'hex'));
      const input = utxo.input();
      const txid = Buffer.from(input.transaction_id().to_bytes(), 'utf8').toString('hex');
      const txindx = input.index();
      const output = utxo.output();
      const amount = output.amount().coin().to_str();
      const multiasset = output.amount().multiasset();
      let multiAssetStr = "";

      if (multiasset) {
        const keys = multiasset.keys();
        const N = keys.len();

        for (let i = 0; i < N; i++) {
          const policyId = keys.get(i);
          const policyIdHex = Buffer.from(policyId.to_bytes(), 'utf8').toString();
          
          const assets = multiasset.get(policyId);
          const assetNames = assets.keys();
          const K = assetNames.len();

          for (let j = 0; j < K; j++) {
            const assetName = assetNames.get(j);
            const assetNameString = Buffer.from(assetName.name(), 'utf8').toString();
            const assetNameHex = Buffer.from(assetName.name(), 'utf8').toString('hex');
            const multiassetAmt = multiasset.get_asset(policyId, assetName);
            multiAssetStr += `+ ${multiassetAmt.to_str()} + ${policyIdHex}.${assetNameHex} (${assetNameString})`;
          }
        }
      }
      const obj = {
        txid: txid,
        txindx: txindx,
        amount: amount,
        str: `${txid} #${txindx} = ${amount}`,
        multiAssetStr: multiAssetStr,
        TransactionUnspentOutput: utxo
      }
      UTXOs.push(obj);
    }
    return UTXOs;
  }
  /*
  * Returns the current cardano network parameters from koios
  * @returns {Promise<* | undefined>} Promise of network parameters json or undefined if api route returns unsuccessful.
  */
  async function getNetworkParameters() {
    let networkId = await getNetworkId();
    let koios = undefined;
    if (networkId === 1)
      koios = await axios({method: 'GET', url: 'https://api.koios.rest/api/v0/epoch_params'});
    else
      koios = await axios({method: 'GET', url: 'https://preview.koios.rest/api/v0/epoch_params'});
    
    if (koios.status === 200) {
      return koios.data[0];
    }
    return undefined;
  }
  /*
  * Query currently enabled wallet to see what network it is connected to
  * 1 = Mainnet 0 = Testnet
  * @Returns {Promise<Number | undefined>} Promise of a networkId or undefined if no wallet is enabled.
  */
  async function getNetworkId() {
    if (EnabledWallet) {
      let networkId = await EnabledWallet.api.getNetworkId();
      return networkId
    }
    return undefined;
  }
  /*
  * Initate transaction builder object with given network parameters.
  * @param {*} network parameters from the cardano blockchain.
  * @Returns {Promise<TransactionBuilder>} Promise of the created transaction builder object.
  */
  async function initTransactionBuilder(networkParameters) {
    const txBuilder = CardanoWasm.TransactionBuilder.new(
      CardanoWasm.TransactionBuilderConfigBuilder.new()
        .fee_algo(CardanoWasm.LinearFee.new(CardanoWasm.BigNum.from_str(networkParameters.min_fee_a.toString()), CardanoWasm.BigNum.from_str(networkParameters.min_fee_b.toString())))
        .pool_deposit(CardanoWasm.BigNum.from_str(networkParameters.pool_deposit))
        .key_deposit(CardanoWasm.BigNum.from_str(networkParameters.key_deposit))
        .coins_per_utxo_word(CardanoWasm.BigNum.from_str(networkParameters.coins_per_utxo_size))
        .max_value_size(networkParameters.max_val_size)
        .max_tx_size(networkParameters.max_tx_size)
        .prefer_pure_change(true)
        .build()
    );
    return txBuilder;
  }
  /* Setters --------------------*/
  /*
  * Set the current enabled wallet
  * @param {string} name of enabled wallet
  * @param {*} api object of enabled wallet
  * @returns {void}
  */
  function setEnabledWallet(name, api) {
    EnabledWallet = {name:name, api:api};
  }

  /* Getters --------------------*/
  /*
  * Returns all wallets stored in the wallets array
  * @returns {Array} all wallets found after polling browser.
  */
  function returnWallets(){
    return wallets;
  }
  /*
  * Get single wallet from the wallets array at index
  * @param integer
  * @return {wallet_obj}
  */
  function getWalletByIndex(index) {
    if (index <= wallets.length) {
      return wallets[index];
    }
    else {
      return undefined;
    }
  }
  /*
  * Returns the current enabled wallet, name tuple
  * @returns {Tuple} Tuple containing wallet and name of the current enabled wallet. 
  */
  function getEnabledWallet() {
    return EnabledWallet;
  }
  /*
  * Returns the address of the currently enabled wallet
  * @return {Promise<string | undefined>} Promise of Bech32 address of the currently enabled wallet or undefined if no wallet is currently enabled.
  */
  async function getWalletAddress() {
    if (EnabledWallet)
      return new Promise(function(resolve, reject) {
        let addr = ''
        if (EnabledWallet.name == 'Nami') {
          EnabledWallet.api.getUsedAddresses().then((res) => {
            addr = CardanoWasm.Address.from_bytes(Buffer.from(res[0], 'hex'));
            resolve(addr.to_bech32());
          });
        }
        else {
          EnabledWallet.api.getUsedAddresses().then((res) => {
            addr = CardanoWasm.Address.from_bytes(Buffer.from(res[0], 'hex'));
            resolve(addr.to_bech32());
          });
        }
      })
    else
      return undefined;
  }
  /*
  * Returns all the assets in the current enabled wallet
  * @returns {Promise<Array>} Promise array of assets found in current enabled wallet. 
  */
  async function getWalletAssets() {
    if (EnabledWallet) {
      let assets = [];
      const rawBalance = await EnabledWallet.api.getBalance();
      let value = CardanoWasm.Value.from_bytes(Buffer.from(rawBalance, 'hex'));

      if (value.multiasset()) {
        const multiAssets = value.multiasset().keys();

        for (let i = 0; i < multiAssets.len(); i++) {
          const policy = multiAssets.get(i);
          const policyAssets = value.multiasset().get(policy);

          const assetNames = policyAssets.keys();

          for (let j = 0; j < assetNames.len(); j++) {
            const policyAsset = assetNames.get(j);
            const quantity = policyAssets.get(policyAsset);
            const asset = Buffer.from(policy.to_bytes(), 'hex').toString('hex') + Buffer.from(policyAsset.name(), 'hex').toString('hex');
            
            const _policy = asset.slice(0, 56);
            const _name = asset.slice(56);
            const nft_name = hexToAscii(_name);
            assets.push({
              unit: asset,
              quantity: quantity.to_str(),
              policy: _policy,
              name: nft_name,
              fingerprint: null
            });
          }
        }
      }
      return assets;
    }
  };
  return {
    getInstance: function() {
      if (!instance) {
        instance = createInstance();
      }
      return instance;
    },
    pollWallets: function() {
      pollAllWallets();
    },
    signData: async function(data) {
      return await enabledWalletSignData(data);
    },
    sendADATransaction: async function(recipientAddress, amount) {
      await sendAdaTransaction(recipientAddress, amount);
    },
    getWallets: function() {
      return returnWallets();
    },
    getWalletAt: function(index) {
      return getWalletByIndex(index);
    },
    selectWallet: async function(index) {
      setEnabledWallet(getWalletByIndex(index).name, await enableWallet(getWalletByIndex(index)));
    },
    enabledWallet: function() {
      return getEnabledWallet();
    },
    getEnabledWalletAddress: async function() {
      return await getWalletAddress();
    },
    getEnabledWalletAssets: async function() {
      return await getWalletAssets();
    }
  }
});

function hexToAscii(str1)
{
  let hex  = str1.toString();
  let str = '';
  for (let n = 0; n < hex.length; n += 2) {
    str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
  }
  return str;
}

function toHex(str) {
  var result = '';
  for (var i = 0; i < str.length; i++) {
    result += str.charCodeAt(i).toString(16);
  }
  return result;
}
