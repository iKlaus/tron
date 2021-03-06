var net = require('net');
var mdns = require('mdns');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var async = require('async');
var client = new net.Socket();
var conf = require('config');
var debug = require('debug')('client:app');
var resolveCluster = require('./lib/mdnsClusterResolver');
var resolverSequence = [
    mdns.rst.DNSServiceResolve(),
    // raspbians mdns implementation fails at resolving ipv6 addresses…what a bummer
    'DNSServiceGetAddrInfo' in mdns.dns_sd ? mdns.rst.DNSServiceGetAddrInfo() : mdns.rst.getaddrinfo({families: [4]}),
    mdns.rst.makeAddressesUnique(),
    resolveCluster({cluster: conf.protocol.txtRecord.cluster})
];

var gpio = require('./lib/gpio');
var macAddress = require('./lib/macAddressResolver');
var Protocol = require('../lib/protocol');
var ServicePool = require('./lib/servicePool');
var Client = require('../lib/client');
var browser = require('./lib/browser');

var clientState = new Client({
    id: macAddress,
    url: conf.client.browser.url
});

clientState.on('needToNavigate', function (url) {
    browser.navigate(url, function () {
        clientState.emit('change');
    });
});
clientState.on('needToSwitch', function (state) {
    gpio.write(conf.client.io.tv, state, function (err) {
        if (err) {
            debug(err);
        }
        else {
            clientState.emit('change');
        }
    });
});

var protocol = new Protocol({
    onGreeting: function (data, con) {
        // server acknowledged our existence
        debug(data);
        clientState.update(data);
    },
    onRequest: function (data, con) {
        this.emit(data.action, data, con);
    },
    additional: {
        selfUpdate: function (data, con) {
            var child = exec(
                'git pull',
                {
                    cwd: process.cwd(),
                    uid: process.getuid(),
                    gid: process.getgid()
                },
                function (error, stdout, stderr) {
                    debug('stdout: ' + stdout);
                    debug('stderr: ' + stderr);

                    if (error !== null) {
                        console.log('exec error: ' + error);
                    }
                    else {
                        // stop, environment will get us back up
                        // as soon as possible
                        process.exit();
                    }
                });

            self.respond(clientState.responseData({
                token: data.token
            }), con);
        },
        /**
         * @param {Object}     data
         * @param {net.Socket} con
         */
        setUrl: function (data, con) {
            var self = this;

            clientState.url = data.url;

            self.respond(clientState.responseData({
                token: data.token
            }), con);
        },
        /**
         * @param {Object}     data
         * @param {net.Socket} con
         */
        setPanicUrl: function (data, con) {
            var self = this;

            clientState.panicUrl = data.url;

            self.respond(clientState.responseData({
                token: data.token
            }), con);
        },
        /**
         * @param {Object}     data
         * @param {net.Socket} con
         */
        setPanicState: function (data, con) {
            var self = this;

            clientState.panicState = data.state;

            self.respond(clientState.responseData({
                token: data.token
            }), con);
        },
        /**
         * @param {Object}     data
         * @param {net.Socket} con
         */
        switchTV: function (data, con) {
            var self = this;

            clientState.state = data.state;

            self.respond(clientState.responseData({
                token: data.token
            }), con);
        }
    }
});

var mdnsBrowser = mdns.createBrowser(mdns.tcp(conf.protocol.name), {resolverSequence: resolverSequence});
var services = new ServicePool(client, mdnsBrowser);

client.on('connect', function () {
    // introduce ourselves
    protocol.greet(clientState.responseData(), this);
});

client.on('data', function (data) {
    protocol.interpret(data, this);
});

// initializations
async.waterfall([
    // setup GPIO
    function (next) {
        gpio.setup(conf.client.io.tv, gpio.DIR_OUT, function (err) {
            if (err) {
                next(err);
            }
            else {
                gpio.read(conf.client.io.tv, function (err, value) {
                    if (!err) {
                        clientState.state = !!value;
                    }

                    next(err);
                });
            }
        });
    },
    // fallback to lower privileges
    function (next) {
        // // if started via sudo (necessary on raspi to get access to GPIOs)
        // // we get an environment variable for UID and GID which we can use
        // // to lower our privileges
        // var gid = parseInt(process.env.SUDO_GID);
        // var uid = parseInt(process.env.SUDO_UID);
        //
        // if (gid) {
        //     process.setgid(gid);
        // }
        // if (uid) {
        //     process.setuid(uid);
        // }

        next();
    },
    // setup Chrome
    function (next) {
        browser.init(conf.client.browser, function (err) {
            next(err);
        });
    },
    // start mdns Browser
    function (next) {
        services.start();
        next();
    }
], function (err) {
    if (err) {
        console.log('Initialization failed due to raised error: ', err);
        process.exit(1);
    }
});
