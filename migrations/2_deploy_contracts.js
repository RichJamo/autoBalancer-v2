var autoBalancer = artifacts.require("./autoBalancer.sol");

module.exports = function(deployer) {
  deployer.deploy(autoBalancer);
};
