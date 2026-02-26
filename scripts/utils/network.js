const os = require('os');

function getIPv4Addresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const infos of Object.values(interfaces)) {
    if (!infos) continue;
    for (const info of infos) {
      if (!info) continue;
      if (info.family === 'IPv4' && !info.internal) {
        addresses.push(info.address);
      }
    }
  }

  return addresses;
}

function getPrimaryIPv4Address() {
  const [first] = getIPv4Addresses();
  return first || null;
}

module.exports = {
  getIPv4Addresses,
  getPrimaryIPv4Address,
};
