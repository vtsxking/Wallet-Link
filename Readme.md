# Wallet Link

## Description
Wallet-Link is the spiritual successor to `Simple_Cardano_Connector` (now deprecated), which retains the same core ideas and functionalities while being completely overhauled to be easier to utilize and maintain. This tool allows developers to interact with Cardano wallets and blockchain through simple function calls from the `Wallet-Link` singleton.

## Getting Started
To use Wallet-Link, simply include the walletlink.js file in your application or website. For example, in a static webpage, add the following to the HTML file:
```javascript
<script type="text/javascript" src="WalletLink.js"></script>
```
Then, create a new instance of WalletLink and utilize the functionality as follows:

``` javascript
let walletlink = new WalletLink();
// poll wallets in user browser for existing active wallets
walletlink.pollWallets();

// get the frist wallet in the list of present wallets
await walletlink.selectWallet(0);

// send 1 ADA to address 'xxx'
await walletlink.sendADATransaction('xxx', '1000000');
```
That's it! You can now use Wallet-Link to interact with Cardano wallets and blockchain.

## Build
If you want to add your own functions to Wallet-Link, you can easily rebundle them into the wallet-link.js file.

First, make sure you have all the required modules installed by running npm install if they are not already installed.

Next, add your desired functions to src/index.js. Once you have made your changes, run npm run build to have webpack bundle all the files into a single JavaScript file. The output file will be located in the dist directory.

That's it! You now have your customized version of Wallet-Link.

## Todo
Wallet-Link is still a work in progress, and there are a few areas where additional functionality is needed. The following items are currently on our to-do list:

* **Sending Tokens:** I plan to add functionality for sending tokens in addition to ADA.

* **Plutus Smart Contracts:** I also plan to add support for interacting with Plutus smart contracts on the Cardano blockchain.

* **Continued Refactoring:** I am continuously working on refactoring Wallet-Link to make it easier for developers to utilize with their projects.

I am actively working on these features, and they will be added to Wallet-Link in future updates. If you have any suggestions or feature requests, please feel free to create an issue or submit a pull request.