// Get the modal
let modal = document.getElementById("myModal");

// Get the button that opens the modal
let btn = document.getElementById("myBtn");

// Get the <span> element that closes the modal
let span = document.getElementsByClassName("close")[0];

// When the user clicks the button, open the modal
btn.onclick = function () {
  modal.style.display = "block";
  let wallets = returnWallets();
  console.log(wallets);
  for (let i = 0; i < wallets.length; i++) {
    console.log(wallets[i].name);
    let walletbtn = document.createElement("button");
    walletbtn.id = "btn_"+wallets[i].name;
    if (wallets[i].name == "Nami"){
        walletbtn.innerHTML = '<img src="assets/images/nami_icon.svg" width="50em" />';
    }
    else if (wallets[i].name == "yoroi"){
        walletbtn.innerHTML = '<img src="assets/images/yoroi_icon.webp" width="50em" />';
    }
    else {
        walletbtn.innerHTML = '<img src='+ wallets[i].icon +' width="50em" />';
    }
    walletbtn.onclick = async function () {
      let assets = await getWalletAddress(enableWallet(wallets[i]));
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
