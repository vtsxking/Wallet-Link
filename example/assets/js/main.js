// Get the modal
let modal = document.getElementById("myModal");

// Get the button that opens the modal
let btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
let span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal
btn.onclick = function () {
  modal.style.display = "block";

  // create wallet link object
  let walletlink = new WalletLink();

  // get all active wallets in browser
  walletlink.pollWallets();

  // return all wallets
  let wallets = walletlink.getWallets();

  // iterate over wallets to create buttons for each wallet
  for (let i = 0; i < wallets.length; i++) {

    let walletbtn = document.createElement("button");
    walletbtn.id = "btn_"+wallets[i].name;
    
    walletbtn.innerHTML = '<img src="'+ wallets[i].icon +'" width="50em" />';

    walletbtn.onclick = async function () {
      // select wallet
      await walletlink.selectWallet(i);
      // get wallet assets
      let assets = await walletlink.getEnabledWalletAssets();
      console.log(assets);
    };
    let tooltip = document.createElement("div");
    tooltip.innerText = wallets[i].name;
    tooltip.className = "hidden";
    walletbtn.appendChild(tooltip);
    document.getElementById("modal-contents").append(walletbtn);
  }
};

// When the user clicks on <span> (x), close the modal
span.onclick = function () {
  modal.style.display = "none";
};

// When the user clicks anywhere outside of the modal, close it
window.onclick = function (event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
};
