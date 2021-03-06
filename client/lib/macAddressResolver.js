var os = require('os');
// determine a mac address we may use to identify ourselves
module.exports = (function (interfaces) {
    var testInterfaces = ['eth0', 'eth1', 'en0', 'wlan0', 'wlan1'],
        mac = undefined;

    testInterfaces.forEach(function (name) {
        var anInterface = interfaces[name];

        if (anInterface) {
            mac = anInterface[0].mac;
        }
    });

    return mac || Object.keys(interfaces).sort().reduce(function (carry, current) {
            if (carry) {
                return carry;
            }

            return interfaces[current].reduce(function (carry, current) {
                return carry || (false === current.internal ? current.mac : undefined);
            }, undefined);
        }, undefined);
})(os.networkInterfaces());
