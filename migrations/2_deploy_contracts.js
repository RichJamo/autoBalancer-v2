var bentoboxDapp = artifacts.require("./bentoboxDapp.sol");

module.exports = function(deployer) {
  deployer.deploy(bentoboxDapp);
};
