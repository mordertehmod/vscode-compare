"use strict";
var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};

// node_modules/universalify/index.js
var require_universalify = __commonJS({
  "node_modules/universalify/index.js"(exports2) {
    "use strict";
    exports2.fromCallback = function(fn) {
      return Object.defineProperty(function() {
        if (typeof arguments[arguments.length - 1] === "function")
          fn.apply(this, arguments);
        else {
          return new Promise((resolve, reject) => {
            arguments[arguments.length] = (err, res) => {
              if (err)
                return reject(err);
              resolve(res);
            };
            arguments.length++;
            fn.apply(this, arguments);
          });
        }
      }, "name", { value: fn.name });
    };
    exports2.fromPromise = function(fn) {
      return Object.defineProperty(function() {
        const cb = arguments[arguments.length - 1];
        if (typeof cb !== "function")
          return fn.apply(this, arguments);
        else
          fn.apply(this, arguments).then((r) => cb(null, r), cb);
      }, "name", { value: fn.name });
    };
  }
});

// node_modules/graceful-fs/polyfills.js
var require_polyfills = __commonJS({
  "node_modules/graceful-fs/polyfills.js"(exports2, module2) {
    var constants = require("constants");
    var origCwd = process.cwd;
    var cwd = null;
    var platform = process.env.GRACEFUL_FS_PLATFORM || process.platform;
    process.cwd = function() {
      if (!cwd)
        cwd = origCwd.call(process);
      return cwd;
    };
    try {
      process.cwd();
    } catch (er) {
    }
    if (typeof process.chdir === "function") {
      chdir = process.chdir;
      process.chdir = function(d) {
        cwd = null;
        chdir.call(process, d);
      };
      if (Object.setPrototypeOf)
        Object.setPrototypeOf(process.chdir, chdir);
    }
    var chdir;
    module2.exports = patch;
    function patch(fs) {
      if (constants.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) {
        patchLchmod(fs);
      }
      if (!fs.lutimes) {
        patchLutimes(fs);
      }
      fs.chown = chownFix(fs.chown);
      fs.fchown = chownFix(fs.fchown);
      fs.lchown = chownFix(fs.lchown);
      fs.chmod = chmodFix(fs.chmod);
      fs.fchmod = chmodFix(fs.fchmod);
      fs.lchmod = chmodFix(fs.lchmod);
      fs.chownSync = chownFixSync(fs.chownSync);
      fs.fchownSync = chownFixSync(fs.fchownSync);
      fs.lchownSync = chownFixSync(fs.lchownSync);
      fs.chmodSync = chmodFixSync(fs.chmodSync);
      fs.fchmodSync = chmodFixSync(fs.fchmodSync);
      fs.lchmodSync = chmodFixSync(fs.lchmodSync);
      fs.stat = statFix(fs.stat);
      fs.fstat = statFix(fs.fstat);
      fs.lstat = statFix(fs.lstat);
      fs.statSync = statFixSync(fs.statSync);
      fs.fstatSync = statFixSync(fs.fstatSync);
      fs.lstatSync = statFixSync(fs.lstatSync);
      if (fs.chmod && !fs.lchmod) {
        fs.lchmod = function(path, mode, cb) {
          if (cb)
            process.nextTick(cb);
        };
        fs.lchmodSync = function() {
        };
      }
      if (fs.chown && !fs.lchown) {
        fs.lchown = function(path, uid, gid, cb) {
          if (cb)
            process.nextTick(cb);
        };
        fs.lchownSync = function() {
        };
      }
      if (platform === "win32") {
        fs.rename = typeof fs.rename !== "function" ? fs.rename : function(fs$rename) {
          function rename(from, to, cb) {
            var start = Date.now();
            var backoff = 0;
            fs$rename(from, to, function CB(er) {
              if (er && (er.code === "EACCES" || er.code === "EPERM" || er.code === "EBUSY") && Date.now() - start < 6e4) {
                setTimeout(function() {
                  fs.stat(to, function(stater, st) {
                    if (stater && stater.code === "ENOENT")
                      fs$rename(from, to, CB);
                    else
                      cb(er);
                  });
                }, backoff);
                if (backoff < 100)
                  backoff += 10;
                return;
              }
              if (cb)
                cb(er);
            });
          }
          if (Object.setPrototypeOf)
            Object.setPrototypeOf(rename, fs$rename);
          return rename;
        }(fs.rename);
      }
      fs.read = typeof fs.read !== "function" ? fs.read : function(fs$read) {
        function read(fd, buffer, offset, length, position, callback_) {
          var callback;
          if (callback_ && typeof callback_ === "function") {
            var eagCounter = 0;
            callback = function(er, _, __) {
              if (er && er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                return fs$read.call(fs, fd, buffer, offset, length, position, callback);
              }
              callback_.apply(this, arguments);
            };
          }
          return fs$read.call(fs, fd, buffer, offset, length, position, callback);
        }
        if (Object.setPrototypeOf)
          Object.setPrototypeOf(read, fs$read);
        return read;
      }(fs.read);
      fs.readSync = typeof fs.readSync !== "function" ? fs.readSync : /* @__PURE__ */ function(fs$readSync) {
        return function(fd, buffer, offset, length, position) {
          var eagCounter = 0;
          while (true) {
            try {
              return fs$readSync.call(fs, fd, buffer, offset, length, position);
            } catch (er) {
              if (er.code === "EAGAIN" && eagCounter < 10) {
                eagCounter++;
                continue;
              }
              throw er;
            }
          }
        };
      }(fs.readSync);
      function patchLchmod(fs2) {
        fs2.lchmod = function(path, mode, callback) {
          fs2.open(
            path,
            constants.O_WRONLY | constants.O_SYMLINK,
            mode,
            function(err, fd) {
              if (err) {
                if (callback)
                  callback(err);
                return;
              }
              fs2.fchmod(fd, mode, function(err2) {
                fs2.close(fd, function(err22) {
                  if (callback)
                    callback(err2 || err22);
                });
              });
            }
          );
        };
        fs2.lchmodSync = function(path, mode) {
          var fd = fs2.openSync(path, constants.O_WRONLY | constants.O_SYMLINK, mode);
          var threw = true;
          var ret;
          try {
            ret = fs2.fchmodSync(fd, mode);
            threw = false;
          } finally {
            if (threw) {
              try {
                fs2.closeSync(fd);
              } catch (er) {
              }
            } else {
              fs2.closeSync(fd);
            }
          }
          return ret;
        };
      }
      function patchLutimes(fs2) {
        if (constants.hasOwnProperty("O_SYMLINK") && fs2.futimes) {
          fs2.lutimes = function(path, at, mt, cb) {
            fs2.open(path, constants.O_SYMLINK, function(er, fd) {
              if (er) {
                if (cb)
                  cb(er);
                return;
              }
              fs2.futimes(fd, at, mt, function(er2) {
                fs2.close(fd, function(er22) {
                  if (cb)
                    cb(er2 || er22);
                });
              });
            });
          };
          fs2.lutimesSync = function(path, at, mt) {
            var fd = fs2.openSync(path, constants.O_SYMLINK);
            var ret;
            var threw = true;
            try {
              ret = fs2.futimesSync(fd, at, mt);
              threw = false;
            } finally {
              if (threw) {
                try {
                  fs2.closeSync(fd);
                } catch (er) {
                }
              } else {
                fs2.closeSync(fd);
              }
            }
            return ret;
          };
        } else if (fs2.futimes) {
          fs2.lutimes = function(_a, _b, _c, cb) {
            if (cb)
              process.nextTick(cb);
          };
          fs2.lutimesSync = function() {
          };
        }
      }
      function chmodFix(orig) {
        if (!orig)
          return orig;
        return function(target, mode, cb) {
          return orig.call(fs, target, mode, function(er) {
            if (chownErOk(er))
              er = null;
            if (cb)
              cb.apply(this, arguments);
          });
        };
      }
      function chmodFixSync(orig) {
        if (!orig)
          return orig;
        return function(target, mode) {
          try {
            return orig.call(fs, target, mode);
          } catch (er) {
            if (!chownErOk(er))
              throw er;
          }
        };
      }
      function chownFix(orig) {
        if (!orig)
          return orig;
        return function(target, uid, gid, cb) {
          return orig.call(fs, target, uid, gid, function(er) {
            if (chownErOk(er))
              er = null;
            if (cb)
              cb.apply(this, arguments);
          });
        };
      }
      function chownFixSync(orig) {
        if (!orig)
          return orig;
        return function(target, uid, gid) {
          try {
            return orig.call(fs, target, uid, gid);
          } catch (er) {
            if (!chownErOk(er))
              throw er;
          }
        };
      }
      function statFix(orig) {
        if (!orig)
          return orig;
        return function(target, options, cb) {
          if (typeof options === "function") {
            cb = options;
            options = null;
          }
          function callback(er, stats) {
            if (stats) {
              if (stats.uid < 0)
                stats.uid += 4294967296;
              if (stats.gid < 0)
                stats.gid += 4294967296;
            }
            if (cb)
              cb.apply(this, arguments);
          }
          return options ? orig.call(fs, target, options, callback) : orig.call(fs, target, callback);
        };
      }
      function statFixSync(orig) {
        if (!orig)
          return orig;
        return function(target, options) {
          var stats = options ? orig.call(fs, target, options) : orig.call(fs, target);
          if (stats) {
            if (stats.uid < 0)
              stats.uid += 4294967296;
            if (stats.gid < 0)
              stats.gid += 4294967296;
          }
          return stats;
        };
      }
      function chownErOk(er) {
        if (!er)
          return true;
        if (er.code === "ENOSYS")
          return true;
        var nonroot = !process.getuid || process.getuid() !== 0;
        if (nonroot) {
          if (er.code === "EINVAL" || er.code === "EPERM")
            return true;
        }
        return false;
      }
    }
  }
});

// node_modules/graceful-fs/legacy-streams.js
var require_legacy_streams = __commonJS({
  "node_modules/graceful-fs/legacy-streams.js"(exports2, module2) {
    var Stream = require("stream").Stream;
    module2.exports = legacy;
    function legacy(fs) {
      return {
        ReadStream,
        WriteStream
      };
      function ReadStream(path, options) {
        if (!(this instanceof ReadStream))
          return new ReadStream(path, options);
        Stream.call(this);
        var self2 = this;
        this.path = path;
        this.fd = null;
        this.readable = true;
        this.paused = false;
        this.flags = "r";
        this.mode = 438;
        this.bufferSize = 64 * 1024;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.encoding)
          this.setEncoding(this.encoding);
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.end === void 0) {
            this.end = Infinity;
          } else if ("number" !== typeof this.end) {
            throw TypeError("end must be a Number");
          }
          if (this.start > this.end) {
            throw new Error("start must be <= end");
          }
          this.pos = this.start;
        }
        if (this.fd !== null) {
          process.nextTick(function() {
            self2._read();
          });
          return;
        }
        fs.open(this.path, this.flags, this.mode, function(err, fd) {
          if (err) {
            self2.emit("error", err);
            self2.readable = false;
            return;
          }
          self2.fd = fd;
          self2.emit("open", fd);
          self2._read();
        });
      }
      function WriteStream(path, options) {
        if (!(this instanceof WriteStream))
          return new WriteStream(path, options);
        Stream.call(this);
        this.path = path;
        this.fd = null;
        this.writable = true;
        this.flags = "w";
        this.encoding = "binary";
        this.mode = 438;
        this.bytesWritten = 0;
        options = options || {};
        var keys = Object.keys(options);
        for (var index = 0, length = keys.length; index < length; index++) {
          var key = keys[index];
          this[key] = options[key];
        }
        if (this.start !== void 0) {
          if ("number" !== typeof this.start) {
            throw TypeError("start must be a Number");
          }
          if (this.start < 0) {
            throw new Error("start must be >= zero");
          }
          this.pos = this.start;
        }
        this.busy = false;
        this._queue = [];
        if (this.fd === null) {
          this._open = fs.open;
          this._queue.push([this._open, this.path, this.flags, this.mode, void 0]);
          this.flush();
        }
      }
    }
  }
});

// node_modules/graceful-fs/clone.js
var require_clone = __commonJS({
  "node_modules/graceful-fs/clone.js"(exports2, module2) {
    "use strict";
    module2.exports = clone;
    var getPrototypeOf = Object.getPrototypeOf || function(obj) {
      return obj.__proto__;
    };
    function clone(obj) {
      if (obj === null || typeof obj !== "object")
        return obj;
      if (obj instanceof Object)
        var copy = { __proto__: getPrototypeOf(obj) };
      else
        var copy = /* @__PURE__ */ Object.create(null);
      Object.getOwnPropertyNames(obj).forEach(function(key) {
        Object.defineProperty(copy, key, Object.getOwnPropertyDescriptor(obj, key));
      });
      return copy;
    }
  }
});

// node_modules/graceful-fs/graceful-fs.js
var require_graceful_fs = __commonJS({
  "node_modules/graceful-fs/graceful-fs.js"(exports2, module2) {
    var fs = require("fs");
    var polyfills = require_polyfills();
    var legacy = require_legacy_streams();
    var clone = require_clone();
    var util = require("util");
    var gracefulQueue;
    var previousSymbol;
    if (typeof Symbol === "function" && typeof Symbol.for === "function") {
      gracefulQueue = Symbol.for("graceful-fs.queue");
      previousSymbol = Symbol.for("graceful-fs.previous");
    } else {
      gracefulQueue = "___graceful-fs.queue";
      previousSymbol = "___graceful-fs.previous";
    }
    function noop() {
    }
    function publishQueue(context, queue2) {
      Object.defineProperty(context, gracefulQueue, {
        get: function() {
          return queue2;
        }
      });
    }
    var debug = noop;
    if (util.debuglog)
      debug = util.debuglog("gfs4");
    else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
      debug = function() {
        var m = util.format.apply(util, arguments);
        m = "GFS4: " + m.split(/\n/).join("\nGFS4: ");
        console.error(m);
      };
    if (!fs[gracefulQueue]) {
      queue = global[gracefulQueue] || [];
      publishQueue(fs, queue);
      fs.close = function(fs$close) {
        function close(fd, cb) {
          return fs$close.call(fs, fd, function(err) {
            if (!err) {
              resetQueue();
            }
            if (typeof cb === "function")
              cb.apply(this, arguments);
          });
        }
        Object.defineProperty(close, previousSymbol, {
          value: fs$close
        });
        return close;
      }(fs.close);
      fs.closeSync = function(fs$closeSync) {
        function closeSync(fd) {
          fs$closeSync.apply(fs, arguments);
          resetQueue();
        }
        Object.defineProperty(closeSync, previousSymbol, {
          value: fs$closeSync
        });
        return closeSync;
      }(fs.closeSync);
      if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || "")) {
        process.on("exit", function() {
          debug(fs[gracefulQueue]);
          require("assert").equal(fs[gracefulQueue].length, 0);
        });
      }
    }
    var queue;
    if (!global[gracefulQueue]) {
      publishQueue(global, fs[gracefulQueue]);
    }
    module2.exports = patch(clone(fs));
    if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !fs.__patched) {
      module2.exports = patch(fs);
      fs.__patched = true;
    }
    function patch(fs2) {
      polyfills(fs2);
      fs2.gracefulify = patch;
      fs2.createReadStream = createReadStream;
      fs2.createWriteStream = createWriteStream;
      var fs$readFile = fs2.readFile;
      fs2.readFile = readFile;
      function readFile(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$readFile(path, options, cb);
        function go$readFile(path2, options2, cb2, startTime) {
          return fs$readFile(path2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$readFile, [path2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$writeFile = fs2.writeFile;
      fs2.writeFile = writeFile;
      function writeFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$writeFile(path, data, options, cb);
        function go$writeFile(path2, data2, options2, cb2, startTime) {
          return fs$writeFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$writeFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$appendFile = fs2.appendFile;
      if (fs$appendFile)
        fs2.appendFile = appendFile;
      function appendFile(path, data, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        return go$appendFile(path, data, options, cb);
        function go$appendFile(path2, data2, options2, cb2, startTime) {
          return fs$appendFile(path2, data2, options2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$appendFile, [path2, data2, options2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$copyFile = fs2.copyFile;
      if (fs$copyFile)
        fs2.copyFile = copyFile;
      function copyFile(src, dest, flags, cb) {
        if (typeof flags === "function") {
          cb = flags;
          flags = 0;
        }
        return go$copyFile(src, dest, flags, cb);
        function go$copyFile(src2, dest2, flags2, cb2, startTime) {
          return fs$copyFile(src2, dest2, flags2, function(err) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$copyFile, [src2, dest2, flags2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      var fs$readdir = fs2.readdir;
      fs2.readdir = readdir;
      var noReaddirOptionVersions = /^v[0-5]\./;
      function readdir(path, options, cb) {
        if (typeof options === "function")
          cb = options, options = null;
        var go$readdir = noReaddirOptionVersions.test(process.version) ? function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        } : function go$readdir2(path2, options2, cb2, startTime) {
          return fs$readdir(path2, options2, fs$readdirCallback(
            path2,
            options2,
            cb2,
            startTime
          ));
        };
        return go$readdir(path, options, cb);
        function fs$readdirCallback(path2, options2, cb2, startTime) {
          return function(err, files) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([
                go$readdir,
                [path2, options2, cb2],
                err,
                startTime || Date.now(),
                Date.now()
              ]);
            else {
              if (files && files.sort)
                files.sort();
              if (typeof cb2 === "function")
                cb2.call(this, err, files);
            }
          };
        }
      }
      if (process.version.substr(0, 4) === "v0.8") {
        var legStreams = legacy(fs2);
        ReadStream = legStreams.ReadStream;
        WriteStream = legStreams.WriteStream;
      }
      var fs$ReadStream = fs2.ReadStream;
      if (fs$ReadStream) {
        ReadStream.prototype = Object.create(fs$ReadStream.prototype);
        ReadStream.prototype.open = ReadStream$open;
      }
      var fs$WriteStream = fs2.WriteStream;
      if (fs$WriteStream) {
        WriteStream.prototype = Object.create(fs$WriteStream.prototype);
        WriteStream.prototype.open = WriteStream$open;
      }
      Object.defineProperty(fs2, "ReadStream", {
        get: function() {
          return ReadStream;
        },
        set: function(val) {
          ReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      Object.defineProperty(fs2, "WriteStream", {
        get: function() {
          return WriteStream;
        },
        set: function(val) {
          WriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileReadStream = ReadStream;
      Object.defineProperty(fs2, "FileReadStream", {
        get: function() {
          return FileReadStream;
        },
        set: function(val) {
          FileReadStream = val;
        },
        enumerable: true,
        configurable: true
      });
      var FileWriteStream = WriteStream;
      Object.defineProperty(fs2, "FileWriteStream", {
        get: function() {
          return FileWriteStream;
        },
        set: function(val) {
          FileWriteStream = val;
        },
        enumerable: true,
        configurable: true
      });
      function ReadStream(path, options) {
        if (this instanceof ReadStream)
          return fs$ReadStream.apply(this, arguments), this;
        else
          return ReadStream.apply(Object.create(ReadStream.prototype), arguments);
      }
      function ReadStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            if (that.autoClose)
              that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
            that.read();
          }
        });
      }
      function WriteStream(path, options) {
        if (this instanceof WriteStream)
          return fs$WriteStream.apply(this, arguments), this;
        else
          return WriteStream.apply(Object.create(WriteStream.prototype), arguments);
      }
      function WriteStream$open() {
        var that = this;
        open(that.path, that.flags, that.mode, function(err, fd) {
          if (err) {
            that.destroy();
            that.emit("error", err);
          } else {
            that.fd = fd;
            that.emit("open", fd);
          }
        });
      }
      function createReadStream(path, options) {
        return new fs2.ReadStream(path, options);
      }
      function createWriteStream(path, options) {
        return new fs2.WriteStream(path, options);
      }
      var fs$open = fs2.open;
      fs2.open = open;
      function open(path, flags, mode, cb) {
        if (typeof mode === "function")
          cb = mode, mode = null;
        return go$open(path, flags, mode, cb);
        function go$open(path2, flags2, mode2, cb2, startTime) {
          return fs$open(path2, flags2, mode2, function(err, fd) {
            if (err && (err.code === "EMFILE" || err.code === "ENFILE"))
              enqueue([go$open, [path2, flags2, mode2, cb2], err, startTime || Date.now(), Date.now()]);
            else {
              if (typeof cb2 === "function")
                cb2.apply(this, arguments);
            }
          });
        }
      }
      return fs2;
    }
    function enqueue(elem) {
      debug("ENQUEUE", elem[0].name, elem[1]);
      fs[gracefulQueue].push(elem);
      retry();
    }
    var retryTimer;
    function resetQueue() {
      var now = Date.now();
      for (var i = 0; i < fs[gracefulQueue].length; ++i) {
        if (fs[gracefulQueue][i].length > 2) {
          fs[gracefulQueue][i][3] = now;
          fs[gracefulQueue][i][4] = now;
        }
      }
      retry();
    }
    function retry() {
      clearTimeout(retryTimer);
      retryTimer = void 0;
      if (fs[gracefulQueue].length === 0)
        return;
      var elem = fs[gracefulQueue].shift();
      var fn = elem[0];
      var args = elem[1];
      var err = elem[2];
      var startTime = elem[3];
      var lastTime = elem[4];
      if (startTime === void 0) {
        debug("RETRY", fn.name, args);
        fn.apply(null, args);
      } else if (Date.now() - startTime >= 6e4) {
        debug("TIMEOUT", fn.name, args);
        var cb = args.pop();
        if (typeof cb === "function")
          cb.call(null, err);
      } else {
        var sinceAttempt = Date.now() - lastTime;
        var sinceStart = Math.max(lastTime - startTime, 1);
        var desiredDelay = Math.min(sinceStart * 1.2, 100);
        if (sinceAttempt >= desiredDelay) {
          debug("RETRY", fn.name, args);
          fn.apply(null, args.concat([startTime]));
        } else {
          fs[gracefulQueue].push(elem);
        }
      }
      if (retryTimer === void 0) {
        retryTimer = setTimeout(retry, 0);
      }
    }
  }
});

// node_modules/fs-extra/lib/fs/index.js
var require_fs = __commonJS({
  "node_modules/fs-extra/lib/fs/index.js"(exports2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var fs = require_graceful_fs();
    var api = [
      "access",
      "appendFile",
      "chmod",
      "chown",
      "close",
      "copyFile",
      "fchmod",
      "fchown",
      "fdatasync",
      "fstat",
      "fsync",
      "ftruncate",
      "futimes",
      "lchown",
      "lchmod",
      "link",
      "lstat",
      "mkdir",
      "mkdtemp",
      "open",
      "readFile",
      "readdir",
      "readlink",
      "realpath",
      "rename",
      "rmdir",
      "stat",
      "symlink",
      "truncate",
      "unlink",
      "utimes",
      "writeFile"
    ].filter((key) => {
      return typeof fs[key] === "function";
    });
    Object.keys(fs).forEach((key) => {
      if (key === "promises") {
        return;
      }
      exports2[key] = fs[key];
    });
    api.forEach((method) => {
      exports2[method] = u(fs[method]);
    });
    exports2.exists = function(filename, callback) {
      if (typeof callback === "function") {
        return fs.exists(filename, callback);
      }
      return new Promise((resolve) => {
        return fs.exists(filename, resolve);
      });
    };
    exports2.read = function(fd, buffer, offset, length, position, callback) {
      if (typeof callback === "function") {
        return fs.read(fd, buffer, offset, length, position, callback);
      }
      return new Promise((resolve, reject) => {
        fs.read(fd, buffer, offset, length, position, (err, bytesRead, buffer2) => {
          if (err)
            return reject(err);
          resolve({ bytesRead, buffer: buffer2 });
        });
      });
    };
    exports2.write = function(fd, buffer, ...args) {
      if (typeof args[args.length - 1] === "function") {
        return fs.write(fd, buffer, ...args);
      }
      return new Promise((resolve, reject) => {
        fs.write(fd, buffer, ...args, (err, bytesWritten, buffer2) => {
          if (err)
            return reject(err);
          resolve({ bytesWritten, buffer: buffer2 });
        });
      });
    };
    if (typeof fs.realpath.native === "function") {
      exports2.realpath.native = u(fs.realpath.native);
    }
  }
});

// node_modules/fs-extra/lib/mkdirs/win32.js
var require_win32 = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/win32.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    function getRootPath(p) {
      p = path.normalize(path.resolve(p)).split(path.sep);
      if (p.length > 0)
        return p[0];
      return null;
    }
    var INVALID_PATH_CHARS = /[<>:"|?*]/;
    function invalidWin32Path(p) {
      const rp = getRootPath(p);
      p = p.replace(rp, "");
      return INVALID_PATH_CHARS.test(p);
    }
    module2.exports = {
      getRootPath,
      invalidWin32Path
    };
  }
});

// node_modules/fs-extra/lib/mkdirs/mkdirs.js
var require_mkdirs = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/mkdirs.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    var path = require("path");
    var invalidWin32Path = require_win32().invalidWin32Path;
    var o777 = parseInt("0777", 8);
    function mkdirs(p, opts, callback, made) {
      if (typeof opts === "function") {
        callback = opts;
        opts = {};
      } else if (!opts || typeof opts !== "object") {
        opts = { mode: opts };
      }
      if (process.platform === "win32" && invalidWin32Path(p)) {
        const errInval = new Error(p + " contains invalid WIN32 path characters.");
        errInval.code = "EINVAL";
        return callback(errInval);
      }
      let mode = opts.mode;
      const xfs = opts.fs || fs;
      if (mode === void 0) {
        mode = o777 & ~process.umask();
      }
      if (!made)
        made = null;
      callback = callback || function() {
      };
      p = path.resolve(p);
      xfs.mkdir(p, mode, (er) => {
        if (!er) {
          made = made || p;
          return callback(null, made);
        }
        switch (er.code) {
          case "ENOENT":
            if (path.dirname(p) === p)
              return callback(er);
            mkdirs(path.dirname(p), opts, (er2, made2) => {
              if (er2)
                callback(er2, made2);
              else
                mkdirs(p, opts, callback, made2);
            });
            break;
          default:
            xfs.stat(p, (er2, stat) => {
              if (er2 || !stat.isDirectory())
                callback(er, made);
              else
                callback(null, made);
            });
            break;
        }
      });
    }
    module2.exports = mkdirs;
  }
});

// node_modules/fs-extra/lib/mkdirs/mkdirs-sync.js
var require_mkdirs_sync = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/mkdirs-sync.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    var path = require("path");
    var invalidWin32Path = require_win32().invalidWin32Path;
    var o777 = parseInt("0777", 8);
    function mkdirsSync(p, opts, made) {
      if (!opts || typeof opts !== "object") {
        opts = { mode: opts };
      }
      let mode = opts.mode;
      const xfs = opts.fs || fs;
      if (process.platform === "win32" && invalidWin32Path(p)) {
        const errInval = new Error(p + " contains invalid WIN32 path characters.");
        errInval.code = "EINVAL";
        throw errInval;
      }
      if (mode === void 0) {
        mode = o777 & ~process.umask();
      }
      if (!made)
        made = null;
      p = path.resolve(p);
      try {
        xfs.mkdirSync(p, mode);
        made = made || p;
      } catch (err0) {
        if (err0.code === "ENOENT") {
          if (path.dirname(p) === p)
            throw err0;
          made = mkdirsSync(path.dirname(p), opts, made);
          mkdirsSync(p, opts, made);
        } else {
          let stat;
          try {
            stat = xfs.statSync(p);
          } catch (err1) {
            throw err0;
          }
          if (!stat.isDirectory())
            throw err0;
        }
      }
      return made;
    }
    module2.exports = mkdirsSync;
  }
});

// node_modules/fs-extra/lib/mkdirs/index.js
var require_mkdirs2 = __commonJS({
  "node_modules/fs-extra/lib/mkdirs/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var mkdirs = u(require_mkdirs());
    var mkdirsSync = require_mkdirs_sync();
    module2.exports = {
      mkdirs,
      mkdirsSync,
      // alias
      mkdirp: mkdirs,
      mkdirpSync: mkdirsSync,
      ensureDir: mkdirs,
      ensureDirSync: mkdirsSync
    };
  }
});

// node_modules/fs-extra/lib/util/utimes.js
var require_utimes = __commonJS({
  "node_modules/fs-extra/lib/util/utimes.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    var os = require("os");
    var path = require("path");
    function hasMillisResSync() {
      let tmpfile = path.join("millis-test-sync" + Date.now().toString() + Math.random().toString().slice(2));
      tmpfile = path.join(os.tmpdir(), tmpfile);
      const d = /* @__PURE__ */ new Date(1435410243862);
      fs.writeFileSync(tmpfile, "https://github.com/jprichardson/node-fs-extra/pull/141");
      const fd = fs.openSync(tmpfile, "r+");
      fs.futimesSync(fd, d, d);
      fs.closeSync(fd);
      return fs.statSync(tmpfile).mtime > 1435410243e3;
    }
    function hasMillisRes(callback) {
      let tmpfile = path.join("millis-test" + Date.now().toString() + Math.random().toString().slice(2));
      tmpfile = path.join(os.tmpdir(), tmpfile);
      const d = /* @__PURE__ */ new Date(1435410243862);
      fs.writeFile(tmpfile, "https://github.com/jprichardson/node-fs-extra/pull/141", (err) => {
        if (err)
          return callback(err);
        fs.open(tmpfile, "r+", (err2, fd) => {
          if (err2)
            return callback(err2);
          fs.futimes(fd, d, d, (err3) => {
            if (err3)
              return callback(err3);
            fs.close(fd, (err4) => {
              if (err4)
                return callback(err4);
              fs.stat(tmpfile, (err5, stats) => {
                if (err5)
                  return callback(err5);
                callback(null, stats.mtime > 1435410243e3);
              });
            });
          });
        });
      });
    }
    function timeRemoveMillis(timestamp) {
      if (typeof timestamp === "number") {
        return Math.floor(timestamp / 1e3) * 1e3;
      } else if (timestamp instanceof Date) {
        return new Date(Math.floor(timestamp.getTime() / 1e3) * 1e3);
      } else {
        throw new Error("fs-extra: timeRemoveMillis() unknown parameter type");
      }
    }
    function utimesMillis(path2, atime, mtime, callback) {
      fs.open(path2, "r+", (err, fd) => {
        if (err)
          return callback(err);
        fs.futimes(fd, atime, mtime, (futimesErr) => {
          fs.close(fd, (closeErr) => {
            if (callback)
              callback(futimesErr || closeErr);
          });
        });
      });
    }
    function utimesMillisSync(path2, atime, mtime) {
      const fd = fs.openSync(path2, "r+");
      fs.futimesSync(fd, atime, mtime);
      return fs.closeSync(fd);
    }
    module2.exports = {
      hasMillisRes,
      hasMillisResSync,
      timeRemoveMillis,
      utimesMillis,
      utimesMillisSync
    };
  }
});

// node_modules/fs-extra/lib/util/stat.js
var require_stat = __commonJS({
  "node_modules/fs-extra/lib/util/stat.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    var path = require("path");
    var NODE_VERSION_MAJOR_WITH_BIGINT = 10;
    var NODE_VERSION_MINOR_WITH_BIGINT = 5;
    var NODE_VERSION_PATCH_WITH_BIGINT = 0;
    var nodeVersion = process.versions.node.split(".");
    var nodeVersionMajor = Number.parseInt(nodeVersion[0], 10);
    var nodeVersionMinor = Number.parseInt(nodeVersion[1], 10);
    var nodeVersionPatch = Number.parseInt(nodeVersion[2], 10);
    function nodeSupportsBigInt() {
      if (nodeVersionMajor > NODE_VERSION_MAJOR_WITH_BIGINT) {
        return true;
      } else if (nodeVersionMajor === NODE_VERSION_MAJOR_WITH_BIGINT) {
        if (nodeVersionMinor > NODE_VERSION_MINOR_WITH_BIGINT) {
          return true;
        } else if (nodeVersionMinor === NODE_VERSION_MINOR_WITH_BIGINT) {
          if (nodeVersionPatch >= NODE_VERSION_PATCH_WITH_BIGINT) {
            return true;
          }
        }
      }
      return false;
    }
    function getStats(src, dest, cb) {
      if (nodeSupportsBigInt()) {
        fs.stat(src, { bigint: true }, (err, srcStat) => {
          if (err)
            return cb(err);
          fs.stat(dest, { bigint: true }, (err2, destStat) => {
            if (err2) {
              if (err2.code === "ENOENT")
                return cb(null, { srcStat, destStat: null });
              return cb(err2);
            }
            return cb(null, { srcStat, destStat });
          });
        });
      } else {
        fs.stat(src, (err, srcStat) => {
          if (err)
            return cb(err);
          fs.stat(dest, (err2, destStat) => {
            if (err2) {
              if (err2.code === "ENOENT")
                return cb(null, { srcStat, destStat: null });
              return cb(err2);
            }
            return cb(null, { srcStat, destStat });
          });
        });
      }
    }
    function getStatsSync(src, dest) {
      let srcStat, destStat;
      if (nodeSupportsBigInt()) {
        srcStat = fs.statSync(src, { bigint: true });
      } else {
        srcStat = fs.statSync(src);
      }
      try {
        if (nodeSupportsBigInt()) {
          destStat = fs.statSync(dest, { bigint: true });
        } else {
          destStat = fs.statSync(dest);
        }
      } catch (err) {
        if (err.code === "ENOENT")
          return { srcStat, destStat: null };
        throw err;
      }
      return { srcStat, destStat };
    }
    function checkPaths(src, dest, funcName, cb) {
      getStats(src, dest, (err, stats) => {
        if (err)
          return cb(err);
        const { srcStat, destStat } = stats;
        if (destStat && destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
          return cb(new Error("Source and destination must not be the same."));
        }
        if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
          return cb(new Error(errMsg(src, dest, funcName)));
        }
        return cb(null, { srcStat, destStat });
      });
    }
    function checkPathsSync(src, dest, funcName) {
      const { srcStat, destStat } = getStatsSync(src, dest);
      if (destStat && destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
        throw new Error("Source and destination must not be the same.");
      }
      if (srcStat.isDirectory() && isSrcSubdir(src, dest)) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return { srcStat, destStat };
    }
    function checkParentPaths(src, srcStat, dest, funcName, cb) {
      const srcParent = path.resolve(path.dirname(src));
      const destParent = path.resolve(path.dirname(dest));
      if (destParent === srcParent || destParent === path.parse(destParent).root)
        return cb();
      if (nodeSupportsBigInt()) {
        fs.stat(destParent, { bigint: true }, (err, destStat) => {
          if (err) {
            if (err.code === "ENOENT")
              return cb();
            return cb(err);
          }
          if (destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
            return cb(new Error(errMsg(src, dest, funcName)));
          }
          return checkParentPaths(src, srcStat, destParent, funcName, cb);
        });
      } else {
        fs.stat(destParent, (err, destStat) => {
          if (err) {
            if (err.code === "ENOENT")
              return cb();
            return cb(err);
          }
          if (destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
            return cb(new Error(errMsg(src, dest, funcName)));
          }
          return checkParentPaths(src, srcStat, destParent, funcName, cb);
        });
      }
    }
    function checkParentPathsSync(src, srcStat, dest, funcName) {
      const srcParent = path.resolve(path.dirname(src));
      const destParent = path.resolve(path.dirname(dest));
      if (destParent === srcParent || destParent === path.parse(destParent).root)
        return;
      let destStat;
      try {
        if (nodeSupportsBigInt()) {
          destStat = fs.statSync(destParent, { bigint: true });
        } else {
          destStat = fs.statSync(destParent);
        }
      } catch (err) {
        if (err.code === "ENOENT")
          return;
        throw err;
      }
      if (destStat.ino && destStat.dev && destStat.ino === srcStat.ino && destStat.dev === srcStat.dev) {
        throw new Error(errMsg(src, dest, funcName));
      }
      return checkParentPathsSync(src, srcStat, destParent, funcName);
    }
    function isSrcSubdir(src, dest) {
      const srcArr = path.resolve(src).split(path.sep).filter((i) => i);
      const destArr = path.resolve(dest).split(path.sep).filter((i) => i);
      return srcArr.reduce((acc, cur, i) => acc && destArr[i] === cur, true);
    }
    function errMsg(src, dest, funcName) {
      return `Cannot ${funcName} '${src}' to a subdirectory of itself, '${dest}'.`;
    }
    module2.exports = {
      checkPaths,
      checkPathsSync,
      checkParentPaths,
      checkParentPathsSync,
      isSrcSubdir
    };
  }
});

// node_modules/fs-extra/lib/util/buffer.js
var require_buffer = __commonJS({
  "node_modules/fs-extra/lib/util/buffer.js"(exports2, module2) {
    "use strict";
    module2.exports = function(size) {
      if (typeof Buffer.allocUnsafe === "function") {
        try {
          return Buffer.allocUnsafe(size);
        } catch (e) {
          return new Buffer(size);
        }
      }
      return new Buffer(size);
    };
  }
});

// node_modules/fs-extra/lib/copy-sync/copy-sync.js
var require_copy_sync = __commonJS({
  "node_modules/fs-extra/lib/copy-sync/copy-sync.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    var path = require("path");
    var mkdirpSync = require_mkdirs2().mkdirsSync;
    var utimesSync = require_utimes().utimesMillisSync;
    var stat = require_stat();
    function copySync(src, dest, opts) {
      if (typeof opts === "function") {
        opts = { filter: opts };
      }
      opts = opts || {};
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;

    see https://github.com/jprichardson/node-fs-extra/issues/269`);
      }
      const { srcStat, destStat } = stat.checkPathsSync(src, dest, "copy");
      stat.checkParentPathsSync(src, srcStat, dest, "copy");
      return handleFilterAndCopy(destStat, src, dest, opts);
    }
    function handleFilterAndCopy(destStat, src, dest, opts) {
      if (opts.filter && !opts.filter(src, dest))
        return;
      const destParent = path.dirname(dest);
      if (!fs.existsSync(destParent))
        mkdirpSync(destParent);
      return startCopy(destStat, src, dest, opts);
    }
    function startCopy(destStat, src, dest, opts) {
      if (opts.filter && !opts.filter(src, dest))
        return;
      return getStats(destStat, src, dest, opts);
    }
    function getStats(destStat, src, dest, opts) {
      const statSync = opts.dereference ? fs.statSync : fs.lstatSync;
      const srcStat = statSync(src);
      if (srcStat.isDirectory())
        return onDir(srcStat, destStat, src, dest, opts);
      else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice())
        return onFile(srcStat, destStat, src, dest, opts);
      else if (srcStat.isSymbolicLink())
        return onLink(destStat, src, dest, opts);
    }
    function onFile(srcStat, destStat, src, dest, opts) {
      if (!destStat)
        return copyFile(srcStat, src, dest, opts);
      return mayCopyFile(srcStat, src, dest, opts);
    }
    function mayCopyFile(srcStat, src, dest, opts) {
      if (opts.overwrite) {
        fs.unlinkSync(dest);
        return copyFile(srcStat, src, dest, opts);
      } else if (opts.errorOnExist) {
        throw new Error(`'${dest}' already exists`);
      }
    }
    function copyFile(srcStat, src, dest, opts) {
      if (typeof fs.copyFileSync === "function") {
        fs.copyFileSync(src, dest);
        fs.chmodSync(dest, srcStat.mode);
        if (opts.preserveTimestamps) {
          return utimesSync(dest, srcStat.atime, srcStat.mtime);
        }
        return;
      }
      return copyFileFallback(srcStat, src, dest, opts);
    }
    function copyFileFallback(srcStat, src, dest, opts) {
      const BUF_LENGTH = 64 * 1024;
      const _buff = require_buffer()(BUF_LENGTH);
      const fdr = fs.openSync(src, "r");
      const fdw = fs.openSync(dest, "w", srcStat.mode);
      let pos = 0;
      while (pos < srcStat.size) {
        const bytesRead = fs.readSync(fdr, _buff, 0, BUF_LENGTH, pos);
        fs.writeSync(fdw, _buff, 0, bytesRead);
        pos += bytesRead;
      }
      if (opts.preserveTimestamps)
        fs.futimesSync(fdw, srcStat.atime, srcStat.mtime);
      fs.closeSync(fdr);
      fs.closeSync(fdw);
    }
    function onDir(srcStat, destStat, src, dest, opts) {
      if (!destStat)
        return mkDirAndCopy(srcStat, src, dest, opts);
      if (destStat && !destStat.isDirectory()) {
        throw new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`);
      }
      return copyDir(src, dest, opts);
    }
    function mkDirAndCopy(srcStat, src, dest, opts) {
      fs.mkdirSync(dest);
      copyDir(src, dest, opts);
      return fs.chmodSync(dest, srcStat.mode);
    }
    function copyDir(src, dest, opts) {
      fs.readdirSync(src).forEach((item) => copyDirItem(item, src, dest, opts));
    }
    function copyDirItem(item, src, dest, opts) {
      const srcItem = path.join(src, item);
      const destItem = path.join(dest, item);
      const { destStat } = stat.checkPathsSync(srcItem, destItem, "copy");
      return startCopy(destStat, srcItem, destItem, opts);
    }
    function onLink(destStat, src, dest, opts) {
      let resolvedSrc = fs.readlinkSync(src);
      if (opts.dereference) {
        resolvedSrc = path.resolve(process.cwd(), resolvedSrc);
      }
      if (!destStat) {
        return fs.symlinkSync(resolvedSrc, dest);
      } else {
        let resolvedDest;
        try {
          resolvedDest = fs.readlinkSync(dest);
        } catch (err) {
          if (err.code === "EINVAL" || err.code === "UNKNOWN")
            return fs.symlinkSync(resolvedSrc, dest);
          throw err;
        }
        if (opts.dereference) {
          resolvedDest = path.resolve(process.cwd(), resolvedDest);
        }
        if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
          throw new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`);
        }
        if (fs.statSync(dest).isDirectory() && stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
          throw new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`);
        }
        return copyLink(resolvedSrc, dest);
      }
    }
    function copyLink(resolvedSrc, dest) {
      fs.unlinkSync(dest);
      return fs.symlinkSync(resolvedSrc, dest);
    }
    module2.exports = copySync;
  }
});

// node_modules/fs-extra/lib/copy-sync/index.js
var require_copy_sync2 = __commonJS({
  "node_modules/fs-extra/lib/copy-sync/index.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      copySync: require_copy_sync()
    };
  }
});

// node_modules/fs-extra/lib/path-exists/index.js
var require_path_exists = __commonJS({
  "node_modules/fs-extra/lib/path-exists/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromPromise;
    var fs = require_fs();
    function pathExists(path) {
      return fs.access(path).then(() => true).catch(() => false);
    }
    module2.exports = {
      pathExists: u(pathExists),
      pathExistsSync: fs.existsSync
    };
  }
});

// node_modules/fs-extra/lib/copy/copy.js
var require_copy = __commonJS({
  "node_modules/fs-extra/lib/copy/copy.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    var path = require("path");
    var mkdirp = require_mkdirs2().mkdirs;
    var pathExists = require_path_exists().pathExists;
    var utimes = require_utimes().utimesMillis;
    var stat = require_stat();
    function copy(src, dest, opts, cb) {
      if (typeof opts === "function" && !cb) {
        cb = opts;
        opts = {};
      } else if (typeof opts === "function") {
        opts = { filter: opts };
      }
      cb = cb || function() {
      };
      opts = opts || {};
      opts.clobber = "clobber" in opts ? !!opts.clobber : true;
      opts.overwrite = "overwrite" in opts ? !!opts.overwrite : opts.clobber;
      if (opts.preserveTimestamps && process.arch === "ia32") {
        console.warn(`fs-extra: Using the preserveTimestamps option in 32-bit node is not recommended;

    see https://github.com/jprichardson/node-fs-extra/issues/269`);
      }
      stat.checkPaths(src, dest, "copy", (err, stats) => {
        if (err)
          return cb(err);
        const { srcStat, destStat } = stats;
        stat.checkParentPaths(src, srcStat, dest, "copy", (err2) => {
          if (err2)
            return cb(err2);
          if (opts.filter)
            return handleFilter(checkParentDir, destStat, src, dest, opts, cb);
          return checkParentDir(destStat, src, dest, opts, cb);
        });
      });
    }
    function checkParentDir(destStat, src, dest, opts, cb) {
      const destParent = path.dirname(dest);
      pathExists(destParent, (err, dirExists) => {
        if (err)
          return cb(err);
        if (dirExists)
          return startCopy(destStat, src, dest, opts, cb);
        mkdirp(destParent, (err2) => {
          if (err2)
            return cb(err2);
          return startCopy(destStat, src, dest, opts, cb);
        });
      });
    }
    function handleFilter(onInclude, destStat, src, dest, opts, cb) {
      Promise.resolve(opts.filter(src, dest)).then((include) => {
        if (include)
          return onInclude(destStat, src, dest, opts, cb);
        return cb();
      }, (error) => cb(error));
    }
    function startCopy(destStat, src, dest, opts, cb) {
      if (opts.filter)
        return handleFilter(getStats, destStat, src, dest, opts, cb);
      return getStats(destStat, src, dest, opts, cb);
    }
    function getStats(destStat, src, dest, opts, cb) {
      const stat2 = opts.dereference ? fs.stat : fs.lstat;
      stat2(src, (err, srcStat) => {
        if (err)
          return cb(err);
        if (srcStat.isDirectory())
          return onDir(srcStat, destStat, src, dest, opts, cb);
        else if (srcStat.isFile() || srcStat.isCharacterDevice() || srcStat.isBlockDevice())
          return onFile(srcStat, destStat, src, dest, opts, cb);
        else if (srcStat.isSymbolicLink())
          return onLink(destStat, src, dest, opts, cb);
      });
    }
    function onFile(srcStat, destStat, src, dest, opts, cb) {
      if (!destStat)
        return copyFile(srcStat, src, dest, opts, cb);
      return mayCopyFile(srcStat, src, dest, opts, cb);
    }
    function mayCopyFile(srcStat, src, dest, opts, cb) {
      if (opts.overwrite) {
        fs.unlink(dest, (err) => {
          if (err)
            return cb(err);
          return copyFile(srcStat, src, dest, opts, cb);
        });
      } else if (opts.errorOnExist) {
        return cb(new Error(`'${dest}' already exists`));
      } else
        return cb();
    }
    function copyFile(srcStat, src, dest, opts, cb) {
      if (typeof fs.copyFile === "function") {
        return fs.copyFile(src, dest, (err) => {
          if (err)
            return cb(err);
          return setDestModeAndTimestamps(srcStat, dest, opts, cb);
        });
      }
      return copyFileFallback(srcStat, src, dest, opts, cb);
    }
    function copyFileFallback(srcStat, src, dest, opts, cb) {
      const rs = fs.createReadStream(src);
      rs.on("error", (err) => cb(err)).once("open", () => {
        const ws = fs.createWriteStream(dest, { mode: srcStat.mode });
        ws.on("error", (err) => cb(err)).on("open", () => rs.pipe(ws)).once("close", () => setDestModeAndTimestamps(srcStat, dest, opts, cb));
      });
    }
    function setDestModeAndTimestamps(srcStat, dest, opts, cb) {
      fs.chmod(dest, srcStat.mode, (err) => {
        if (err)
          return cb(err);
        if (opts.preserveTimestamps) {
          return utimes(dest, srcStat.atime, srcStat.mtime, cb);
        }
        return cb();
      });
    }
    function onDir(srcStat, destStat, src, dest, opts, cb) {
      if (!destStat)
        return mkDirAndCopy(srcStat, src, dest, opts, cb);
      if (destStat && !destStat.isDirectory()) {
        return cb(new Error(`Cannot overwrite non-directory '${dest}' with directory '${src}'.`));
      }
      return copyDir(src, dest, opts, cb);
    }
    function mkDirAndCopy(srcStat, src, dest, opts, cb) {
      fs.mkdir(dest, (err) => {
        if (err)
          return cb(err);
        copyDir(src, dest, opts, (err2) => {
          if (err2)
            return cb(err2);
          return fs.chmod(dest, srcStat.mode, cb);
        });
      });
    }
    function copyDir(src, dest, opts, cb) {
      fs.readdir(src, (err, items) => {
        if (err)
          return cb(err);
        return copyDirItems(items, src, dest, opts, cb);
      });
    }
    function copyDirItems(items, src, dest, opts, cb) {
      const item = items.pop();
      if (!item)
        return cb();
      return copyDirItem(items, item, src, dest, opts, cb);
    }
    function copyDirItem(items, item, src, dest, opts, cb) {
      const srcItem = path.join(src, item);
      const destItem = path.join(dest, item);
      stat.checkPaths(srcItem, destItem, "copy", (err, stats) => {
        if (err)
          return cb(err);
        const { destStat } = stats;
        startCopy(destStat, srcItem, destItem, opts, (err2) => {
          if (err2)
            return cb(err2);
          return copyDirItems(items, src, dest, opts, cb);
        });
      });
    }
    function onLink(destStat, src, dest, opts, cb) {
      fs.readlink(src, (err, resolvedSrc) => {
        if (err)
          return cb(err);
        if (opts.dereference) {
          resolvedSrc = path.resolve(process.cwd(), resolvedSrc);
        }
        if (!destStat) {
          return fs.symlink(resolvedSrc, dest, cb);
        } else {
          fs.readlink(dest, (err2, resolvedDest) => {
            if (err2) {
              if (err2.code === "EINVAL" || err2.code === "UNKNOWN")
                return fs.symlink(resolvedSrc, dest, cb);
              return cb(err2);
            }
            if (opts.dereference) {
              resolvedDest = path.resolve(process.cwd(), resolvedDest);
            }
            if (stat.isSrcSubdir(resolvedSrc, resolvedDest)) {
              return cb(new Error(`Cannot copy '${resolvedSrc}' to a subdirectory of itself, '${resolvedDest}'.`));
            }
            if (destStat.isDirectory() && stat.isSrcSubdir(resolvedDest, resolvedSrc)) {
              return cb(new Error(`Cannot overwrite '${resolvedDest}' with '${resolvedSrc}'.`));
            }
            return copyLink(resolvedSrc, dest, cb);
          });
        }
      });
    }
    function copyLink(resolvedSrc, dest, cb) {
      fs.unlink(dest, (err) => {
        if (err)
          return cb(err);
        return fs.symlink(resolvedSrc, dest, cb);
      });
    }
    module2.exports = copy;
  }
});

// node_modules/fs-extra/lib/copy/index.js
var require_copy2 = __commonJS({
  "node_modules/fs-extra/lib/copy/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    module2.exports = {
      copy: u(require_copy())
    };
  }
});

// node_modules/fs-extra/lib/remove/rimraf.js
var require_rimraf = __commonJS({
  "node_modules/fs-extra/lib/remove/rimraf.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    var path = require("path");
    var assert = require("assert");
    var isWindows = process.platform === "win32";
    function defaults(options) {
      const methods = [
        "unlink",
        "chmod",
        "stat",
        "lstat",
        "rmdir",
        "readdir"
      ];
      methods.forEach((m) => {
        options[m] = options[m] || fs[m];
        m = m + "Sync";
        options[m] = options[m] || fs[m];
      });
      options.maxBusyTries = options.maxBusyTries || 3;
    }
    function rimraf(p, options, cb) {
      let busyTries = 0;
      if (typeof options === "function") {
        cb = options;
        options = {};
      }
      assert(p, "rimraf: missing path");
      assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
      assert.strictEqual(typeof cb, "function", "rimraf: callback function required");
      assert(options, "rimraf: invalid options argument provided");
      assert.strictEqual(typeof options, "object", "rimraf: options should be object");
      defaults(options);
      rimraf_(p, options, function CB(er) {
        if (er) {
          if ((er.code === "EBUSY" || er.code === "ENOTEMPTY" || er.code === "EPERM") && busyTries < options.maxBusyTries) {
            busyTries++;
            const time = busyTries * 100;
            return setTimeout(() => rimraf_(p, options, CB), time);
          }
          if (er.code === "ENOENT")
            er = null;
        }
        cb(er);
      });
    }
    function rimraf_(p, options, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.lstat(p, (er, st) => {
        if (er && er.code === "ENOENT") {
          return cb(null);
        }
        if (er && er.code === "EPERM" && isWindows) {
          return fixWinEPERM(p, options, er, cb);
        }
        if (st && st.isDirectory()) {
          return rmdir(p, options, er, cb);
        }
        options.unlink(p, (er2) => {
          if (er2) {
            if (er2.code === "ENOENT") {
              return cb(null);
            }
            if (er2.code === "EPERM") {
              return isWindows ? fixWinEPERM(p, options, er2, cb) : rmdir(p, options, er2, cb);
            }
            if (er2.code === "EISDIR") {
              return rmdir(p, options, er2, cb);
            }
          }
          return cb(er2);
        });
      });
    }
    function fixWinEPERM(p, options, er, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      if (er) {
        assert(er instanceof Error);
      }
      options.chmod(p, 438, (er2) => {
        if (er2) {
          cb(er2.code === "ENOENT" ? null : er);
        } else {
          options.stat(p, (er3, stats) => {
            if (er3) {
              cb(er3.code === "ENOENT" ? null : er);
            } else if (stats.isDirectory()) {
              rmdir(p, options, er, cb);
            } else {
              options.unlink(p, cb);
            }
          });
        }
      });
    }
    function fixWinEPERMSync(p, options, er) {
      let stats;
      assert(p);
      assert(options);
      if (er) {
        assert(er instanceof Error);
      }
      try {
        options.chmodSync(p, 438);
      } catch (er2) {
        if (er2.code === "ENOENT") {
          return;
        } else {
          throw er;
        }
      }
      try {
        stats = options.statSync(p);
      } catch (er3) {
        if (er3.code === "ENOENT") {
          return;
        } else {
          throw er;
        }
      }
      if (stats.isDirectory()) {
        rmdirSync(p, options, er);
      } else {
        options.unlinkSync(p);
      }
    }
    function rmdir(p, options, originalEr, cb) {
      assert(p);
      assert(options);
      if (originalEr) {
        assert(originalEr instanceof Error);
      }
      assert(typeof cb === "function");
      options.rmdir(p, (er) => {
        if (er && (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM")) {
          rmkids(p, options, cb);
        } else if (er && er.code === "ENOTDIR") {
          cb(originalEr);
        } else {
          cb(er);
        }
      });
    }
    function rmkids(p, options, cb) {
      assert(p);
      assert(options);
      assert(typeof cb === "function");
      options.readdir(p, (er, files) => {
        if (er)
          return cb(er);
        let n = files.length;
        let errState;
        if (n === 0)
          return options.rmdir(p, cb);
        files.forEach((f) => {
          rimraf(path.join(p, f), options, (er2) => {
            if (errState) {
              return;
            }
            if (er2)
              return cb(errState = er2);
            if (--n === 0) {
              options.rmdir(p, cb);
            }
          });
        });
      });
    }
    function rimrafSync(p, options) {
      let st;
      options = options || {};
      defaults(options);
      assert(p, "rimraf: missing path");
      assert.strictEqual(typeof p, "string", "rimraf: path should be a string");
      assert(options, "rimraf: missing options");
      assert.strictEqual(typeof options, "object", "rimraf: options should be object");
      try {
        st = options.lstatSync(p);
      } catch (er) {
        if (er.code === "ENOENT") {
          return;
        }
        if (er.code === "EPERM" && isWindows) {
          fixWinEPERMSync(p, options, er);
        }
      }
      try {
        if (st && st.isDirectory()) {
          rmdirSync(p, options, null);
        } else {
          options.unlinkSync(p);
        }
      } catch (er) {
        if (er.code === "ENOENT") {
          return;
        } else if (er.code === "EPERM") {
          return isWindows ? fixWinEPERMSync(p, options, er) : rmdirSync(p, options, er);
        } else if (er.code !== "EISDIR") {
          throw er;
        }
        rmdirSync(p, options, er);
      }
    }
    function rmdirSync(p, options, originalEr) {
      assert(p);
      assert(options);
      if (originalEr) {
        assert(originalEr instanceof Error);
      }
      try {
        options.rmdirSync(p);
      } catch (er) {
        if (er.code === "ENOTDIR") {
          throw originalEr;
        } else if (er.code === "ENOTEMPTY" || er.code === "EEXIST" || er.code === "EPERM") {
          rmkidsSync(p, options);
        } else if (er.code !== "ENOENT") {
          throw er;
        }
      }
    }
    function rmkidsSync(p, options) {
      assert(p);
      assert(options);
      options.readdirSync(p).forEach((f) => rimrafSync(path.join(p, f), options));
      if (isWindows) {
        const startTime = Date.now();
        do {
          try {
            const ret = options.rmdirSync(p, options);
            return ret;
          } catch (er) {
          }
        } while (Date.now() - startTime < 500);
      } else {
        const ret = options.rmdirSync(p, options);
        return ret;
      }
    }
    module2.exports = rimraf;
    rimraf.sync = rimrafSync;
  }
});

// node_modules/fs-extra/lib/remove/index.js
var require_remove = __commonJS({
  "node_modules/fs-extra/lib/remove/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var rimraf = require_rimraf();
    module2.exports = {
      remove: u(rimraf),
      removeSync: rimraf.sync
    };
  }
});

// node_modules/fs-extra/lib/empty/index.js
var require_empty = __commonJS({
  "node_modules/fs-extra/lib/empty/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var fs = require_graceful_fs();
    var path = require("path");
    var mkdir = require_mkdirs2();
    var remove = require_remove();
    var emptyDir = u(function emptyDir2(dir, callback) {
      callback = callback || function() {
      };
      fs.readdir(dir, (err, items) => {
        if (err)
          return mkdir.mkdirs(dir, callback);
        items = items.map((item) => path.join(dir, item));
        deleteItem();
        function deleteItem() {
          const item = items.pop();
          if (!item)
            return callback();
          remove.remove(item, (err2) => {
            if (err2)
              return callback(err2);
            deleteItem();
          });
        }
      });
    });
    function emptyDirSync(dir) {
      let items;
      try {
        items = fs.readdirSync(dir);
      } catch (err) {
        return mkdir.mkdirsSync(dir);
      }
      items.forEach((item) => {
        item = path.join(dir, item);
        remove.removeSync(item);
      });
    }
    module2.exports = {
      emptyDirSync,
      emptydirSync: emptyDirSync,
      emptyDir,
      emptydir: emptyDir
    };
  }
});

// node_modules/fs-extra/lib/ensure/file.js
var require_file = __commonJS({
  "node_modules/fs-extra/lib/ensure/file.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var path = require("path");
    var fs = require_graceful_fs();
    var mkdir = require_mkdirs2();
    var pathExists = require_path_exists().pathExists;
    function createFile(file, callback) {
      function makeFile() {
        fs.writeFile(file, "", (err) => {
          if (err)
            return callback(err);
          callback();
        });
      }
      fs.stat(file, (err, stats) => {
        if (!err && stats.isFile())
          return callback();
        const dir = path.dirname(file);
        pathExists(dir, (err2, dirExists) => {
          if (err2)
            return callback(err2);
          if (dirExists)
            return makeFile();
          mkdir.mkdirs(dir, (err3) => {
            if (err3)
              return callback(err3);
            makeFile();
          });
        });
      });
    }
    function createFileSync(file) {
      let stats;
      try {
        stats = fs.statSync(file);
      } catch (e) {
      }
      if (stats && stats.isFile())
        return;
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) {
        mkdir.mkdirsSync(dir);
      }
      fs.writeFileSync(file, "");
    }
    module2.exports = {
      createFile: u(createFile),
      createFileSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/link.js
var require_link = __commonJS({
  "node_modules/fs-extra/lib/ensure/link.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var path = require("path");
    var fs = require_graceful_fs();
    var mkdir = require_mkdirs2();
    var pathExists = require_path_exists().pathExists;
    function createLink(srcpath, dstpath, callback) {
      function makeLink(srcpath2, dstpath2) {
        fs.link(srcpath2, dstpath2, (err) => {
          if (err)
            return callback(err);
          callback(null);
        });
      }
      pathExists(dstpath, (err, destinationExists) => {
        if (err)
          return callback(err);
        if (destinationExists)
          return callback(null);
        fs.lstat(srcpath, (err2) => {
          if (err2) {
            err2.message = err2.message.replace("lstat", "ensureLink");
            return callback(err2);
          }
          const dir = path.dirname(dstpath);
          pathExists(dir, (err3, dirExists) => {
            if (err3)
              return callback(err3);
            if (dirExists)
              return makeLink(srcpath, dstpath);
            mkdir.mkdirs(dir, (err4) => {
              if (err4)
                return callback(err4);
              makeLink(srcpath, dstpath);
            });
          });
        });
      });
    }
    function createLinkSync(srcpath, dstpath) {
      const destinationExists = fs.existsSync(dstpath);
      if (destinationExists)
        return void 0;
      try {
        fs.lstatSync(srcpath);
      } catch (err) {
        err.message = err.message.replace("lstat", "ensureLink");
        throw err;
      }
      const dir = path.dirname(dstpath);
      const dirExists = fs.existsSync(dir);
      if (dirExists)
        return fs.linkSync(srcpath, dstpath);
      mkdir.mkdirsSync(dir);
      return fs.linkSync(srcpath, dstpath);
    }
    module2.exports = {
      createLink: u(createLink),
      createLinkSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink-paths.js
var require_symlink_paths = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink-paths.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var fs = require_graceful_fs();
    var pathExists = require_path_exists().pathExists;
    function symlinkPaths(srcpath, dstpath, callback) {
      if (path.isAbsolute(srcpath)) {
        return fs.lstat(srcpath, (err) => {
          if (err) {
            err.message = err.message.replace("lstat", "ensureSymlink");
            return callback(err);
          }
          return callback(null, {
            "toCwd": srcpath,
            "toDst": srcpath
          });
        });
      } else {
        const dstdir = path.dirname(dstpath);
        const relativeToDst = path.join(dstdir, srcpath);
        return pathExists(relativeToDst, (err, exists) => {
          if (err)
            return callback(err);
          if (exists) {
            return callback(null, {
              "toCwd": relativeToDst,
              "toDst": srcpath
            });
          } else {
            return fs.lstat(srcpath, (err2) => {
              if (err2) {
                err2.message = err2.message.replace("lstat", "ensureSymlink");
                return callback(err2);
              }
              return callback(null, {
                "toCwd": srcpath,
                "toDst": path.relative(dstdir, srcpath)
              });
            });
          }
        });
      }
    }
    function symlinkPathsSync(srcpath, dstpath) {
      let exists;
      if (path.isAbsolute(srcpath)) {
        exists = fs.existsSync(srcpath);
        if (!exists)
          throw new Error("absolute srcpath does not exist");
        return {
          "toCwd": srcpath,
          "toDst": srcpath
        };
      } else {
        const dstdir = path.dirname(dstpath);
        const relativeToDst = path.join(dstdir, srcpath);
        exists = fs.existsSync(relativeToDst);
        if (exists) {
          return {
            "toCwd": relativeToDst,
            "toDst": srcpath
          };
        } else {
          exists = fs.existsSync(srcpath);
          if (!exists)
            throw new Error("relative srcpath does not exist");
          return {
            "toCwd": srcpath,
            "toDst": path.relative(dstdir, srcpath)
          };
        }
      }
    }
    module2.exports = {
      symlinkPaths,
      symlinkPathsSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink-type.js
var require_symlink_type = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink-type.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    function symlinkType(srcpath, type, callback) {
      callback = typeof type === "function" ? type : callback;
      type = typeof type === "function" ? false : type;
      if (type)
        return callback(null, type);
      fs.lstat(srcpath, (err, stats) => {
        if (err)
          return callback(null, "file");
        type = stats && stats.isDirectory() ? "dir" : "file";
        callback(null, type);
      });
    }
    function symlinkTypeSync(srcpath, type) {
      let stats;
      if (type)
        return type;
      try {
        stats = fs.lstatSync(srcpath);
      } catch (e) {
        return "file";
      }
      return stats && stats.isDirectory() ? "dir" : "file";
    }
    module2.exports = {
      symlinkType,
      symlinkTypeSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/symlink.js
var require_symlink = __commonJS({
  "node_modules/fs-extra/lib/ensure/symlink.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var path = require("path");
    var fs = require_graceful_fs();
    var _mkdirs = require_mkdirs2();
    var mkdirs = _mkdirs.mkdirs;
    var mkdirsSync = _mkdirs.mkdirsSync;
    var _symlinkPaths = require_symlink_paths();
    var symlinkPaths = _symlinkPaths.symlinkPaths;
    var symlinkPathsSync = _symlinkPaths.symlinkPathsSync;
    var _symlinkType = require_symlink_type();
    var symlinkType = _symlinkType.symlinkType;
    var symlinkTypeSync = _symlinkType.symlinkTypeSync;
    var pathExists = require_path_exists().pathExists;
    function createSymlink(srcpath, dstpath, type, callback) {
      callback = typeof type === "function" ? type : callback;
      type = typeof type === "function" ? false : type;
      pathExists(dstpath, (err, destinationExists) => {
        if (err)
          return callback(err);
        if (destinationExists)
          return callback(null);
        symlinkPaths(srcpath, dstpath, (err2, relative) => {
          if (err2)
            return callback(err2);
          srcpath = relative.toDst;
          symlinkType(relative.toCwd, type, (err3, type2) => {
            if (err3)
              return callback(err3);
            const dir = path.dirname(dstpath);
            pathExists(dir, (err4, dirExists) => {
              if (err4)
                return callback(err4);
              if (dirExists)
                return fs.symlink(srcpath, dstpath, type2, callback);
              mkdirs(dir, (err5) => {
                if (err5)
                  return callback(err5);
                fs.symlink(srcpath, dstpath, type2, callback);
              });
            });
          });
        });
      });
    }
    function createSymlinkSync(srcpath, dstpath, type) {
      const destinationExists = fs.existsSync(dstpath);
      if (destinationExists)
        return void 0;
      const relative = symlinkPathsSync(srcpath, dstpath);
      srcpath = relative.toDst;
      type = symlinkTypeSync(relative.toCwd, type);
      const dir = path.dirname(dstpath);
      const exists = fs.existsSync(dir);
      if (exists)
        return fs.symlinkSync(srcpath, dstpath, type);
      mkdirsSync(dir);
      return fs.symlinkSync(srcpath, dstpath, type);
    }
    module2.exports = {
      createSymlink: u(createSymlink),
      createSymlinkSync
    };
  }
});

// node_modules/fs-extra/lib/ensure/index.js
var require_ensure = __commonJS({
  "node_modules/fs-extra/lib/ensure/index.js"(exports2, module2) {
    "use strict";
    var file = require_file();
    var link = require_link();
    var symlink = require_symlink();
    module2.exports = {
      // file
      createFile: file.createFile,
      createFileSync: file.createFileSync,
      ensureFile: file.createFile,
      ensureFileSync: file.createFileSync,
      // link
      createLink: link.createLink,
      createLinkSync: link.createLinkSync,
      ensureLink: link.createLink,
      ensureLinkSync: link.createLinkSync,
      // symlink
      createSymlink: symlink.createSymlink,
      createSymlinkSync: symlink.createSymlinkSync,
      ensureSymlink: symlink.createSymlink,
      ensureSymlinkSync: symlink.createSymlinkSync
    };
  }
});

// node_modules/jsonfile/index.js
var require_jsonfile = __commonJS({
  "node_modules/jsonfile/index.js"(exports2, module2) {
    var _fs;
    try {
      _fs = require_graceful_fs();
    } catch (_) {
      _fs = require("fs");
    }
    function readFile(file, options, callback) {
      if (callback == null) {
        callback = options;
        options = {};
      }
      if (typeof options === "string") {
        options = { encoding: options };
      }
      options = options || {};
      var fs = options.fs || _fs;
      var shouldThrow = true;
      if ("throws" in options) {
        shouldThrow = options.throws;
      }
      fs.readFile(file, options, function(err, data) {
        if (err)
          return callback(err);
        data = stripBom(data);
        var obj;
        try {
          obj = JSON.parse(data, options ? options.reviver : null);
        } catch (err2) {
          if (shouldThrow) {
            err2.message = file + ": " + err2.message;
            return callback(err2);
          } else {
            return callback(null, null);
          }
        }
        callback(null, obj);
      });
    }
    function readFileSync(file, options) {
      options = options || {};
      if (typeof options === "string") {
        options = { encoding: options };
      }
      var fs = options.fs || _fs;
      var shouldThrow = true;
      if ("throws" in options) {
        shouldThrow = options.throws;
      }
      try {
        var content = fs.readFileSync(file, options);
        content = stripBom(content);
        return JSON.parse(content, options.reviver);
      } catch (err) {
        if (shouldThrow) {
          err.message = file + ": " + err.message;
          throw err;
        } else {
          return null;
        }
      }
    }
    function stringify(obj, options) {
      var spaces;
      var EOL = "\n";
      if (typeof options === "object" && options !== null) {
        if (options.spaces) {
          spaces = options.spaces;
        }
        if (options.EOL) {
          EOL = options.EOL;
        }
      }
      var str = JSON.stringify(obj, options ? options.replacer : null, spaces);
      return str.replace(/\n/g, EOL) + EOL;
    }
    function writeFile(file, obj, options, callback) {
      if (callback == null) {
        callback = options;
        options = {};
      }
      options = options || {};
      var fs = options.fs || _fs;
      var str = "";
      try {
        str = stringify(obj, options);
      } catch (err) {
        if (callback)
          callback(err, null);
        return;
      }
      fs.writeFile(file, str, options, callback);
    }
    function writeFileSync(file, obj, options) {
      options = options || {};
      var fs = options.fs || _fs;
      var str = stringify(obj, options);
      return fs.writeFileSync(file, str, options);
    }
    function stripBom(content) {
      if (Buffer.isBuffer(content))
        content = content.toString("utf8");
      content = content.replace(/^\uFEFF/, "");
      return content;
    }
    var jsonfile = {
      readFile,
      readFileSync,
      writeFile,
      writeFileSync
    };
    module2.exports = jsonfile;
  }
});

// node_modules/fs-extra/lib/json/jsonfile.js
var require_jsonfile2 = __commonJS({
  "node_modules/fs-extra/lib/json/jsonfile.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var jsonFile = require_jsonfile();
    module2.exports = {
      // jsonfile exports
      readJson: u(jsonFile.readFile),
      readJsonSync: jsonFile.readFileSync,
      writeJson: u(jsonFile.writeFile),
      writeJsonSync: jsonFile.writeFileSync
    };
  }
});

// node_modules/fs-extra/lib/json/output-json.js
var require_output_json = __commonJS({
  "node_modules/fs-extra/lib/json/output-json.js"(exports2, module2) {
    "use strict";
    var path = require("path");
    var mkdir = require_mkdirs2();
    var pathExists = require_path_exists().pathExists;
    var jsonFile = require_jsonfile2();
    function outputJson(file, data, options, callback) {
      if (typeof options === "function") {
        callback = options;
        options = {};
      }
      const dir = path.dirname(file);
      pathExists(dir, (err, itDoes) => {
        if (err)
          return callback(err);
        if (itDoes)
          return jsonFile.writeJson(file, data, options, callback);
        mkdir.mkdirs(dir, (err2) => {
          if (err2)
            return callback(err2);
          jsonFile.writeJson(file, data, options, callback);
        });
      });
    }
    module2.exports = outputJson;
  }
});

// node_modules/fs-extra/lib/json/output-json-sync.js
var require_output_json_sync = __commonJS({
  "node_modules/fs-extra/lib/json/output-json-sync.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    var path = require("path");
    var mkdir = require_mkdirs2();
    var jsonFile = require_jsonfile2();
    function outputJsonSync(file, data, options) {
      const dir = path.dirname(file);
      if (!fs.existsSync(dir)) {
        mkdir.mkdirsSync(dir);
      }
      jsonFile.writeJsonSync(file, data, options);
    }
    module2.exports = outputJsonSync;
  }
});

// node_modules/fs-extra/lib/json/index.js
var require_json = __commonJS({
  "node_modules/fs-extra/lib/json/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var jsonFile = require_jsonfile2();
    jsonFile.outputJson = u(require_output_json());
    jsonFile.outputJsonSync = require_output_json_sync();
    jsonFile.outputJSON = jsonFile.outputJson;
    jsonFile.outputJSONSync = jsonFile.outputJsonSync;
    jsonFile.writeJSON = jsonFile.writeJson;
    jsonFile.writeJSONSync = jsonFile.writeJsonSync;
    jsonFile.readJSON = jsonFile.readJson;
    jsonFile.readJSONSync = jsonFile.readJsonSync;
    module2.exports = jsonFile;
  }
});

// node_modules/fs-extra/lib/move-sync/move-sync.js
var require_move_sync = __commonJS({
  "node_modules/fs-extra/lib/move-sync/move-sync.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    var path = require("path");
    var copySync = require_copy_sync2().copySync;
    var removeSync = require_remove().removeSync;
    var mkdirpSync = require_mkdirs2().mkdirpSync;
    var stat = require_stat();
    function moveSync(src, dest, opts) {
      opts = opts || {};
      const overwrite = opts.overwrite || opts.clobber || false;
      const { srcStat } = stat.checkPathsSync(src, dest, "move");
      stat.checkParentPathsSync(src, srcStat, dest, "move");
      mkdirpSync(path.dirname(dest));
      return doRename(src, dest, overwrite);
    }
    function doRename(src, dest, overwrite) {
      if (overwrite) {
        removeSync(dest);
        return rename(src, dest, overwrite);
      }
      if (fs.existsSync(dest))
        throw new Error("dest already exists.");
      return rename(src, dest, overwrite);
    }
    function rename(src, dest, overwrite) {
      try {
        fs.renameSync(src, dest);
      } catch (err) {
        if (err.code !== "EXDEV")
          throw err;
        return moveAcrossDevice(src, dest, overwrite);
      }
    }
    function moveAcrossDevice(src, dest, overwrite) {
      const opts = {
        overwrite,
        errorOnExist: true
      };
      copySync(src, dest, opts);
      return removeSync(src);
    }
    module2.exports = moveSync;
  }
});

// node_modules/fs-extra/lib/move-sync/index.js
var require_move_sync2 = __commonJS({
  "node_modules/fs-extra/lib/move-sync/index.js"(exports2, module2) {
    "use strict";
    module2.exports = {
      moveSync: require_move_sync()
    };
  }
});

// node_modules/fs-extra/lib/move/move.js
var require_move = __commonJS({
  "node_modules/fs-extra/lib/move/move.js"(exports2, module2) {
    "use strict";
    var fs = require_graceful_fs();
    var path = require("path");
    var copy = require_copy2().copy;
    var remove = require_remove().remove;
    var mkdirp = require_mkdirs2().mkdirp;
    var pathExists = require_path_exists().pathExists;
    var stat = require_stat();
    function move(src, dest, opts, cb) {
      if (typeof opts === "function") {
        cb = opts;
        opts = {};
      }
      const overwrite = opts.overwrite || opts.clobber || false;
      stat.checkPaths(src, dest, "move", (err, stats) => {
        if (err)
          return cb(err);
        const { srcStat } = stats;
        stat.checkParentPaths(src, srcStat, dest, "move", (err2) => {
          if (err2)
            return cb(err2);
          mkdirp(path.dirname(dest), (err3) => {
            if (err3)
              return cb(err3);
            return doRename(src, dest, overwrite, cb);
          });
        });
      });
    }
    function doRename(src, dest, overwrite, cb) {
      if (overwrite) {
        return remove(dest, (err) => {
          if (err)
            return cb(err);
          return rename(src, dest, overwrite, cb);
        });
      }
      pathExists(dest, (err, destExists) => {
        if (err)
          return cb(err);
        if (destExists)
          return cb(new Error("dest already exists."));
        return rename(src, dest, overwrite, cb);
      });
    }
    function rename(src, dest, overwrite, cb) {
      fs.rename(src, dest, (err) => {
        if (!err)
          return cb();
        if (err.code !== "EXDEV")
          return cb(err);
        return moveAcrossDevice(src, dest, overwrite, cb);
      });
    }
    function moveAcrossDevice(src, dest, overwrite, cb) {
      const opts = {
        overwrite,
        errorOnExist: true
      };
      copy(src, dest, opts, (err) => {
        if (err)
          return cb(err);
        return remove(src, cb);
      });
    }
    module2.exports = move;
  }
});

// node_modules/fs-extra/lib/move/index.js
var require_move2 = __commonJS({
  "node_modules/fs-extra/lib/move/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    module2.exports = {
      move: u(require_move())
    };
  }
});

// node_modules/fs-extra/lib/output/index.js
var require_output = __commonJS({
  "node_modules/fs-extra/lib/output/index.js"(exports2, module2) {
    "use strict";
    var u = require_universalify().fromCallback;
    var fs = require_graceful_fs();
    var path = require("path");
    var mkdir = require_mkdirs2();
    var pathExists = require_path_exists().pathExists;
    function outputFile(file, data, encoding, callback) {
      if (typeof encoding === "function") {
        callback = encoding;
        encoding = "utf8";
      }
      const dir = path.dirname(file);
      pathExists(dir, (err, itDoes) => {
        if (err)
          return callback(err);
        if (itDoes)
          return fs.writeFile(file, data, encoding, callback);
        mkdir.mkdirs(dir, (err2) => {
          if (err2)
            return callback(err2);
          fs.writeFile(file, data, encoding, callback);
        });
      });
    }
    function outputFileSync(file, ...args) {
      const dir = path.dirname(file);
      if (fs.existsSync(dir)) {
        return fs.writeFileSync(file, ...args);
      }
      mkdir.mkdirsSync(dir);
      fs.writeFileSync(file, ...args);
    }
    module2.exports = {
      outputFile: u(outputFile),
      outputFileSync
    };
  }
});

// node_modules/fs-extra/lib/index.js
var require_lib = __commonJS({
  "node_modules/fs-extra/lib/index.js"(exports2, module2) {
    "use strict";
    module2.exports = Object.assign(
      {},
      // Export promiseified graceful-fs:
      require_fs(),
      // Export extra methods:
      require_copy_sync2(),
      require_copy2(),
      require_empty(),
      require_ensure(),
      require_json(),
      require_mkdirs2(),
      require_move_sync2(),
      require_move2(),
      require_output(),
      require_path_exists(),
      require_remove()
    );
    var fs = require("fs");
    if (Object.getOwnPropertyDescriptor(fs, "promises")) {
      Object.defineProperty(module2.exports, "promises", {
        get() {
          return fs.promises;
        }
      });
    }
  }
});

// out/constants/commands.js
var require_commands = __commonJS({
  "out/constants/commands.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.DISMISS_DIFFERENCE = exports2.CLEAR_RECENT_COMPARES = exports2.PICK_FROM_RECENT_COMPARES = exports2.DELETE_FILE = exports2.TAKE_COMPARED_FILE = exports2.TAKE_MY_FILE = exports2.COPY_TO_MY = exports2.COPY_TO_COMPARED = exports2.VIEW_AS_TREE = exports2.VIEW_AS_LIST = exports2.SWAP = exports2.REFRESH = exports2.COMPARE_SELECTED_FOLDERS = exports2.COMPARE_FOLDERS_AGAINST_EACH_OTHER = exports2.COMPARE_FOLDERS_AGAINST_WORKSPACE = exports2.CHOOSE_FOLDERS_AND_COMPARE = exports2.COMPARE_FILES = void 0;
    exports2.COMPARE_FILES = "foldersCompare.compareFiles";
    exports2.CHOOSE_FOLDERS_AND_COMPARE = "foldersCompare.chooseFoldersAndCompare";
    exports2.COMPARE_FOLDERS_AGAINST_WORKSPACE = "foldersCompare.compareFoldersAgainstWorkspace";
    exports2.COMPARE_FOLDERS_AGAINST_EACH_OTHER = "foldersCompare.compareFoldersAgainstEachOther";
    exports2.COMPARE_SELECTED_FOLDERS = "foldersCompare.compareSelectedFolders";
    exports2.REFRESH = "foldersCompare.refresh";
    exports2.SWAP = "foldersCompare.swap";
    exports2.VIEW_AS_LIST = "foldersCompare.viewAsList";
    exports2.VIEW_AS_TREE = "foldersCompare.viewAsTree";
    exports2.COPY_TO_COMPARED = "foldersCompare.copyToCompared";
    exports2.COPY_TO_MY = "foldersCompare.copyToMy";
    exports2.TAKE_MY_FILE = "foldersCompare.takeMyFile";
    exports2.TAKE_COMPARED_FILE = "foldersCompare.takeComparedFile";
    exports2.DELETE_FILE = "foldersCompare.deleteFile";
    exports2.PICK_FROM_RECENT_COMPARES = "foldersCompare.pickFromRecentCompares";
    exports2.CLEAR_RECENT_COMPARES = "foldersCompare.clearRecentCompares";
    exports2.DISMISS_DIFFERENCE = "foldersCompare.dismissDifference";
  }
});

// node_modules/dir-compare/build/src/Entry/EntryEquality.js
var require_EntryEquality = __commonJS({
  "node_modules/dir-compare/build/src/Entry/EntryEquality.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EntryEquality = void 0;
    var fs_1 = __importDefault(require("fs"));
    exports2.EntryEquality = {
      isEntryEqualSync(entry1, entry2, type, options) {
        if (type === "file") {
          return isFileEqualSync(entry1, entry2, options);
        }
        if (type === "directory") {
          return isDirectoryEqual(entry1, entry2, options);
        }
        if (type === "broken-link") {
          return isBrokenLinkEqual();
        }
        throw new Error("Unexpected type " + type);
      },
      isEntryEqualAsync(entry1, entry2, type, asyncDiffSet, options) {
        if (type === "file") {
          return isFileEqualAsync(entry1, entry2, type, asyncDiffSet, options);
        }
        if (type === "directory") {
          return Object.assign({ isSync: true }, isDirectoryEqual(entry1, entry2, options));
        }
        if (type === "broken-link") {
          return Object.assign({ isSync: true }, isBrokenLinkEqual());
        }
        throw new Error("Unexpected type " + type);
      }
    };
    function isFileEqualSync(entry1, entry2, options) {
      if (options.compareSymlink && !isSymlinkEqual(entry1, entry2)) {
        return { same: false, reason: "different-symlink" };
      }
      if (options.compareSize && entry1.stat.size !== entry2.stat.size) {
        return { same: false, reason: "different-size" };
      }
      if (options.compareDate && !isDateEqual(entry1.stat.mtime, entry2.stat.mtime, options.dateTolerance)) {
        return { same: false, reason: "different-date" };
      }
      if (options.compareContent && !options.compareFileSync(entry1.absolutePath, entry1.stat, entry2.absolutePath, entry2.stat, options)) {
        return { same: false, reason: "different-content" };
      }
      return { same: true };
    }
    function isFileEqualAsync(entry1, entry2, type, asyncDiffSet, options) {
      if (options.compareSymlink && !isSymlinkEqual(entry1, entry2)) {
        return { isSync: true, same: false, reason: "different-symlink" };
      }
      if (options.compareSize && entry1.stat.size !== entry2.stat.size) {
        return { isSync: true, same: false, reason: "different-size" };
      }
      if (options.compareDate && !isDateEqual(entry1.stat.mtime, entry2.stat.mtime, options.dateTolerance)) {
        return { isSync: true, same: false, reason: "different-date" };
      }
      if (options.compareContent) {
        let subDiffSet;
        if (!options.noDiffSet) {
          subDiffSet = [];
          asyncDiffSet.push(subDiffSet);
        }
        const samePromise = options.compareFileAsync(entry1.absolutePath, entry1.stat, entry2.absolutePath, entry2.stat, options).then((comparisonResult) => {
          if (typeof comparisonResult !== "boolean") {
            return {
              hasErrors: true,
              error: comparisonResult
            };
          }
          const same = comparisonResult;
          const reason = same ? void 0 : "different-content";
          return {
            hasErrors: false,
            same,
            reason,
            context: {
              entry1,
              entry2,
              type1: type,
              type2: type,
              asyncDiffSet: subDiffSet
            }
          };
        }).catch((error) => ({
          hasErrors: true,
          error
        }));
        return { isSync: false, fileEqualityAsyncPromise: samePromise };
      }
      return { isSync: true, same: true };
    }
    function isDirectoryEqual(entry1, entry2, options) {
      if (options.compareSymlink && !isSymlinkEqual(entry1, entry2)) {
        return { same: false, reason: "different-symlink" };
      }
      return { same: true, reason: void 0 };
    }
    function isBrokenLinkEqual() {
      return { same: false, reason: "broken-link" };
    }
    function isDateEqual(date1, date2, tolerance) {
      return Math.abs(date1.getTime() - date2.getTime()) <= tolerance ? true : false;
    }
    function isSymlinkEqual(entry1, entry2) {
      if (!entry1.isSymlink && !entry2.isSymlink) {
        return true;
      }
      if (entry1.isSymlink && entry2.isSymlink && hasIdenticalLink(entry1.absolutePath, entry2.absolutePath)) {
        return true;
      }
      return false;
    }
    function hasIdenticalLink(path1, path2) {
      return fs_1.default.readlinkSync(path1) === fs_1.default.readlinkSync(path2);
    }
  }
});

// node_modules/dir-compare/build/src/Entry/EntryComparator.js
var require_EntryComparator = __commonJS({
  "node_modules/dir-compare/build/src/Entry/EntryComparator.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EntryComparator = void 0;
    exports2.EntryComparator = {
      compareEntry(a, b, options) {
        if (a.isBrokenLink && b.isBrokenLink) {
          return options.compareNameHandler(a.name, b.name, options);
        } else if (a.isBrokenLink) {
          return -1;
        } else if (b.isBrokenLink) {
          return 1;
        } else if (a.stat.isDirectory() && b.stat.isFile()) {
          return -1;
        } else if (a.stat.isFile() && b.stat.isDirectory()) {
          return 1;
        } else {
          return options.compareNameHandler(a.name, b.name, options);
        }
      }
    };
  }
});

// node_modules/dir-compare/build/src/Entry/EntryBuilder.js
var require_EntryBuilder = __commonJS({
  "node_modules/dir-compare/build/src/Entry/EntryBuilder.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EntryBuilder = void 0;
    var fs_1 = __importDefault(require("fs"));
    var path_1 = __importDefault(require("path"));
    var EntryComparator_1 = require_EntryComparator();
    var PATH_SEP = path_1.default.sep;
    exports2.EntryBuilder = {
      /**
       * Returns the sorted list of entries in a directory.
       */
      buildDirEntries(rootEntry, dirEntries, relativePath, origin, options) {
        const res = [];
        for (let i = 0; i < dirEntries.length; i++) {
          const entryName = dirEntries[i];
          const entryAbsolutePath = rootEntry.absolutePath + PATH_SEP + entryName;
          const entryPath = rootEntry.path + PATH_SEP + entryName;
          const entry = this.buildEntry(entryAbsolutePath, entryPath, entryName, origin, options);
          if (options.skipSymlinks && entry.isSymlink) {
            entry.stat = void 0;
          }
          if (filterEntry(entry, relativePath, options)) {
            res.push(entry);
          }
        }
        return res.sort((a, b) => EntryComparator_1.EntryComparator.compareEntry(a, b, options));
      },
      buildEntry(absolutePath, path, name, origin, options) {
        const stats = getStatIgnoreBrokenLink(absolutePath);
        const isDirectory = stats.stat.isDirectory();
        let isPermissionDenied = false;
        if (options.handlePermissionDenied) {
          const isFile = !isDirectory;
          isPermissionDenied = hasPermissionDenied(absolutePath, isFile, options);
        }
        return {
          name,
          absolutePath,
          path,
          origin,
          stat: stats.stat,
          lstat: stats.lstat,
          isSymlink: stats.lstat.isSymbolicLink(),
          isBrokenLink: stats.isBrokenLink,
          isDirectory,
          isPermissionDenied
        };
      }
    };
    function hasPermissionDenied(absolutePath, isFile, options) {
      if (isFile && !options.compareContent) {
        return false;
      }
      try {
        fs_1.default.accessSync(absolutePath, fs_1.default.constants.R_OK);
        return false;
      } catch (_a) {
        return true;
      }
    }
    function getStatIgnoreBrokenLink(absolutePath) {
      const lstat = fs_1.default.lstatSync(absolutePath);
      try {
        return {
          stat: fs_1.default.statSync(absolutePath),
          lstat,
          isBrokenLink: false
        };
      } catch (error) {
        if (error.code === "ENOENT") {
          return {
            stat: lstat,
            lstat,
            isBrokenLink: true
          };
        }
        throw error;
      }
    }
    function filterEntry(entry, relativePath, options) {
      if (entry.isSymlink && options.skipSymlinks) {
        return false;
      }
      if (options.skipEmptyDirs && entry.stat.isDirectory() && isEmptyDir(entry.absolutePath)) {
        return false;
      }
      return options.filterHandler(entry, relativePath, options);
    }
    function isEmptyDir(path) {
      return fs_1.default.readdirSync(path).length === 0;
    }
  }
});

// node_modules/dir-compare/build/src/Symlink/LoopDetector.js
var require_LoopDetector = __commonJS({
  "node_modules/dir-compare/build/src/Symlink/LoopDetector.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LoopDetector = void 0;
    var fs_1 = __importDefault(require("fs"));
    exports2.LoopDetector = {
      detectLoop(entry, symlinkCache) {
        if (entry && entry.isSymlink) {
          const realPath = fs_1.default.realpathSync(entry.absolutePath);
          if (symlinkCache[realPath]) {
            return true;
          }
        }
        return false;
      },
      initSymlinkCache() {
        return {
          dir1: {},
          dir2: {}
        };
      },
      updateSymlinkCache(symlinkCache, rootEntry1, rootEntry2, loopDetected1, loopDetected2) {
        let symlinkCachePath1, symlinkCachePath2;
        if (rootEntry1 && !loopDetected1) {
          symlinkCachePath1 = rootEntry1.isSymlink ? fs_1.default.realpathSync(rootEntry1.absolutePath) : rootEntry1.absolutePath;
          symlinkCache.dir1[symlinkCachePath1] = true;
        }
        if (rootEntry2 && !loopDetected2) {
          symlinkCachePath2 = rootEntry2.isSymlink ? fs_1.default.realpathSync(rootEntry2.absolutePath) : rootEntry2.absolutePath;
          symlinkCache.dir2[symlinkCachePath2] = true;
        }
      },
      cloneSymlinkCache(symlinkCache) {
        return {
          dir1: shallowClone(symlinkCache.dir1),
          dir2: shallowClone(symlinkCache.dir2)
        };
      }
    };
    function shallowClone(obj) {
      const cloned = {};
      Object.keys(obj).forEach((key) => {
        cloned[key] = obj[key];
      });
      return cloned;
    }
  }
});

// node_modules/dir-compare/build/src/Entry/EntryType.js
var require_EntryType = __commonJS({
  "node_modules/dir-compare/build/src/Entry/EntryType.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.EntryType = void 0;
    exports2.EntryType = {
      /**
       * One of 'missing','file','directory','broken-link'
       */
      getType(entry) {
        if (!entry) {
          return "missing";
        }
        if (entry.isBrokenLink) {
          return "broken-link";
        }
        if (entry.isDirectory) {
          return "directory";
        }
        return "file";
      }
    };
  }
});

// node_modules/dir-compare/build/src/Permission/Permission.js
var require_Permission = __commonJS({
  "node_modules/dir-compare/build/src/Permission/Permission.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Permission = void 0;
    exports2.Permission = {
      getPermissionDeniedState(entry1, entry2) {
        if (entry1.isPermissionDenied && entry2.isPermissionDenied) {
          return "access-error-both";
        } else if (entry1.isPermissionDenied) {
          return "access-error-left";
        } else if (entry2.isPermissionDenied) {
          return "access-error-right";
        } else {
          return "access-ok";
        }
      },
      getPermissionDeniedStateWhenLeftMissing(entry2) {
        let permissionDeniedState = "access-ok";
        if (entry2.isPermissionDenied) {
          permissionDeniedState = "access-error-right";
        }
        return permissionDeniedState;
      },
      getPermissionDeniedStateWhenRightMissing(entry1) {
        let permissionDeniedState = "access-ok";
        if (entry1.isPermissionDenied) {
          permissionDeniedState = "access-error-left";
        }
        return permissionDeniedState;
      }
    };
  }
});

// node_modules/dir-compare/build/src/Statistics/StatisticsUpdate.js
var require_StatisticsUpdate = __commonJS({
  "node_modules/dir-compare/build/src/Statistics/StatisticsUpdate.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.StatisticsUpdate = void 0;
    exports2.StatisticsUpdate = {
      updateStatisticsBoth(entry1, entry2, same, reason, type, permissionDeniedState, statistics, options) {
        same ? statistics.equal++ : statistics.distinct++;
        if (type === "file") {
          same ? statistics.equalFiles++ : statistics.distinctFiles++;
        } else if (type === "directory") {
          same ? statistics.equalDirs++ : statistics.distinctDirs++;
        } else if (type === "broken-link") {
          statistics.brokenLinks.distinctBrokenLinks++;
        } else {
          throw new Error("Unexpected type " + type);
        }
        const isSymlink1 = entry1 ? entry1.isSymlink : false;
        const isSymlink2 = entry2 ? entry2.isSymlink : false;
        const isSymlink = isSymlink1 || isSymlink2;
        if (options.compareSymlink && isSymlink) {
          const symlinkStatistics = statistics.symlinks;
          if (reason === "different-symlink") {
            symlinkStatistics.distinctSymlinks++;
          } else {
            symlinkStatistics.equalSymlinks++;
          }
        }
        if (permissionDeniedState === "access-error-left") {
          statistics.permissionDenied.leftPermissionDenied++;
        } else if (permissionDeniedState === "access-error-right") {
          statistics.permissionDenied.rightPermissionDenied++;
        } else if (permissionDeniedState === "access-error-both") {
          statistics.permissionDenied.distinctPermissionDenied++;
        }
      },
      updateStatisticsLeft(entry1, type, permissionDeniedState, statistics, options) {
        statistics.left++;
        if (type === "file") {
          statistics.leftFiles++;
        } else if (type === "directory") {
          statistics.leftDirs++;
        } else if (type === "broken-link") {
          statistics.brokenLinks.leftBrokenLinks++;
        } else {
          throw new Error("Unexpected type " + type);
        }
        if (options.compareSymlink && entry1.isSymlink) {
          const symlinkStatistics = statistics.symlinks;
          symlinkStatistics.leftSymlinks++;
        }
        if (permissionDeniedState === "access-error-left") {
          statistics.permissionDenied.leftPermissionDenied++;
        }
      },
      updateStatisticsRight(entry2, type, permissionDeniedState, statistics, options) {
        statistics.right++;
        if (type === "file") {
          statistics.rightFiles++;
        } else if (type === "directory") {
          statistics.rightDirs++;
        } else if (type === "broken-link") {
          statistics.brokenLinks.rightBrokenLinks++;
        } else {
          throw new Error("Unexpected type " + type);
        }
        if (options.compareSymlink && entry2.isSymlink) {
          const symlinkStatistics = statistics.symlinks;
          symlinkStatistics.rightSymlinks++;
        }
        if (permissionDeniedState === "access-error-right") {
          statistics.permissionDenied.rightPermissionDenied++;
        }
      }
    };
  }
});

// node_modules/dir-compare/build/src/compareSync.js
var require_compareSync = __commonJS({
  "node_modules/dir-compare/build/src/compareSync.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.compareSync = void 0;
    var fs_1 = __importDefault(require("fs"));
    var path_1 = __importDefault(require("path"));
    var EntryEquality_1 = require_EntryEquality();
    var EntryBuilder_1 = require_EntryBuilder();
    var LoopDetector_1 = require_LoopDetector();
    var EntryComparator_1 = require_EntryComparator();
    var EntryType_1 = require_EntryType();
    var Permission_1 = require_Permission();
    var StatisticsUpdate_1 = require_StatisticsUpdate();
    function getEntries(rootEntry, relativePath, loopDetected, origin, options) {
      if (!rootEntry || loopDetected) {
        return [];
      }
      if (rootEntry.isDirectory) {
        if (rootEntry.isPermissionDenied) {
          return [];
        }
        const entries = fs_1.default.readdirSync(rootEntry.absolutePath);
        return EntryBuilder_1.EntryBuilder.buildDirEntries(rootEntry, entries, relativePath, origin, options);
      }
      return [rootEntry];
    }
    function compareSync(rootEntry1, rootEntry2, level, relativePath, options, statistics, diffSet, symlinkCache) {
      const loopDetected1 = LoopDetector_1.LoopDetector.detectLoop(rootEntry1, symlinkCache.dir1);
      const loopDetected2 = LoopDetector_1.LoopDetector.detectLoop(rootEntry2, symlinkCache.dir2);
      LoopDetector_1.LoopDetector.updateSymlinkCache(symlinkCache, rootEntry1, rootEntry2, loopDetected1, loopDetected2);
      const entries1 = getEntries(rootEntry1, relativePath, loopDetected1, "left", options);
      const entries2 = getEntries(rootEntry2, relativePath, loopDetected2, "right", options);
      let i1 = 0, i2 = 0;
      while (i1 < entries1.length || i2 < entries2.length) {
        const entry1 = entries1[i1];
        const entry2 = entries2[i2];
        let type1, type2;
        let cmp;
        if (i1 < entries1.length && i2 < entries2.length) {
          cmp = EntryComparator_1.EntryComparator.compareEntry(entry1, entry2, options);
          type1 = EntryType_1.EntryType.getType(entry1);
          type2 = EntryType_1.EntryType.getType(entry2);
        } else if (i1 < entries1.length) {
          type1 = EntryType_1.EntryType.getType(entry1);
          type2 = EntryType_1.EntryType.getType(void 0);
          cmp = -1;
        } else {
          type1 = EntryType_1.EntryType.getType(void 0);
          type2 = EntryType_1.EntryType.getType(entry2);
          cmp = 1;
        }
        if (cmp === 0) {
          let same, reason, state;
          const permissionDeniedState = Permission_1.Permission.getPermissionDeniedState(entry1, entry2);
          if (permissionDeniedState === "access-ok") {
            const compareEntryRes = EntryEquality_1.EntryEquality.isEntryEqualSync(entry1, entry2, type1, options);
            state = compareEntryRes.same ? "equal" : "distinct";
            same = compareEntryRes.same;
            reason = compareEntryRes.reason;
          } else {
            state = "distinct";
            same = false;
            reason = "permission-denied";
          }
          options.resultBuilder(entry1, entry2, state, level, relativePath, options, statistics, diffSet, reason, permissionDeniedState);
          StatisticsUpdate_1.StatisticsUpdate.updateStatisticsBoth(entry1, entry2, same, reason, type1, permissionDeniedState, statistics, options);
          i1++;
          i2++;
          if (!options.skipSubdirs && type1 === "directory") {
            compareSync(entry1, entry2, level + 1, path_1.default.join(relativePath, entry1.name), options, statistics, diffSet, LoopDetector_1.LoopDetector.cloneSymlinkCache(symlinkCache));
          }
        } else if (cmp < 0) {
          const permissionDeniedState = Permission_1.Permission.getPermissionDeniedStateWhenRightMissing(entry1);
          options.resultBuilder(entry1, void 0, "left", level, relativePath, options, statistics, diffSet, void 0, permissionDeniedState);
          StatisticsUpdate_1.StatisticsUpdate.updateStatisticsLeft(entry1, type1, permissionDeniedState, statistics, options);
          i1++;
          if (type1 === "directory" && !options.skipSubdirs) {
            compareSync(entry1, void 0, level + 1, path_1.default.join(relativePath, entry1.name), options, statistics, diffSet, LoopDetector_1.LoopDetector.cloneSymlinkCache(symlinkCache));
          }
        } else {
          const permissionDeniedState = Permission_1.Permission.getPermissionDeniedStateWhenLeftMissing(entry2);
          options.resultBuilder(void 0, entry2, "right", level, relativePath, options, statistics, diffSet, void 0, permissionDeniedState);
          StatisticsUpdate_1.StatisticsUpdate.updateStatisticsRight(entry2, type2, permissionDeniedState, statistics, options);
          i2++;
          if (type2 === "directory" && !options.skipSubdirs) {
            compareSync(void 0, entry2, level + 1, path_1.default.join(relativePath, entry2.name), options, statistics, diffSet, LoopDetector_1.LoopDetector.cloneSymlinkCache(symlinkCache));
          }
        }
      }
    }
    exports2.compareSync = compareSync;
  }
});

// node_modules/dir-compare/build/src/FileSystem/FsPromise.js
var require_FsPromise = __commonJS({
  "node_modules/dir-compare/build/src/FileSystem/FsPromise.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FsPromise = void 0;
    var fs_1 = __importDefault(require("fs"));
    exports2.FsPromise = {
      readdir(path) {
        return new Promise((resolve, reject) => {
          fs_1.default.readdir(path, (err, files) => {
            if (err) {
              reject(err);
            } else {
              resolve(files);
            }
          });
        });
      },
      read(fd, buffer, offset, length, position) {
        return new Promise((resolve, reject) => {
          fs_1.default.read(fd, buffer, offset, length, position, (err, bytesRead) => {
            if (err) {
              reject(err);
            } else {
              resolve(bytesRead);
            }
          });
        });
      }
    };
  }
});

// node_modules/yocto-queue/index.js
var require_yocto_queue = __commonJS({
  "node_modules/yocto-queue/index.js"(exports2, module2) {
    var Node = class {
      /// value;
      /// next;
      constructor(value) {
        this.value = value;
        this.next = void 0;
      }
    };
    var Queue = class {
      // TODO: Use private class fields when targeting Node.js 12.
      // #_head;
      // #_tail;
      // #_size;
      constructor() {
        this.clear();
      }
      enqueue(value) {
        const node = new Node(value);
        if (this._head) {
          this._tail.next = node;
          this._tail = node;
        } else {
          this._head = node;
          this._tail = node;
        }
        this._size++;
      }
      dequeue() {
        const current = this._head;
        if (!current) {
          return;
        }
        this._head = this._head.next;
        this._size--;
        return current.value;
      }
      clear() {
        this._head = void 0;
        this._tail = void 0;
        this._size = 0;
      }
      get size() {
        return this._size;
      }
      *[Symbol.iterator]() {
        let current = this._head;
        while (current) {
          yield current.value;
          current = current.next;
        }
      }
    };
    module2.exports = Queue;
  }
});

// node_modules/p-limit/index.js
var require_p_limit = __commonJS({
  "node_modules/p-limit/index.js"(exports2, module2) {
    "use strict";
    var Queue = require_yocto_queue();
    var pLimit = (concurrency) => {
      if (!((Number.isInteger(concurrency) || concurrency === Infinity) && concurrency > 0)) {
        throw new TypeError("Expected `concurrency` to be a number from 1 and up");
      }
      const queue = new Queue();
      let activeCount = 0;
      const next = () => {
        activeCount--;
        if (queue.size > 0) {
          queue.dequeue()();
        }
      };
      const run = async (fn, resolve, ...args) => {
        activeCount++;
        const result = (async () => fn(...args))();
        resolve(result);
        try {
          await result;
        } catch {
        }
        next();
      };
      const enqueue = (fn, resolve, ...args) => {
        queue.enqueue(run.bind(null, fn, resolve, ...args));
        (async () => {
          await Promise.resolve();
          if (activeCount < concurrency && queue.size > 0) {
            queue.dequeue()();
          }
        })();
      };
      const generator = (fn, ...args) => new Promise((resolve) => {
        enqueue(fn, resolve, ...args);
      });
      Object.defineProperties(generator, {
        activeCount: {
          get: () => activeCount
        },
        pendingCount: {
          get: () => queue.size
        },
        clearQueue: {
          value: () => {
            queue.clear();
          }
        }
      });
      return generator;
    };
    module2.exports = pLimit;
  }
});

// node_modules/dir-compare/build/src/compareAsync.js
var require_compareAsync = __commonJS({
  "node_modules/dir-compare/build/src/compareAsync.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.compareAsync = void 0;
    var path_1 = __importDefault(require("path"));
    var EntryEquality_1 = require_EntryEquality();
    var FsPromise_1 = require_FsPromise();
    var EntryBuilder_1 = require_EntryBuilder();
    var LoopDetector_1 = require_LoopDetector();
    var EntryComparator_1 = require_EntryComparator();
    var EntryType_1 = require_EntryType();
    var Permission_1 = require_Permission();
    var StatisticsUpdate_1 = require_StatisticsUpdate();
    var p_limit_1 = __importDefault(require_p_limit());
    var CONCURRENCY = 2;
    function getEntries(rootEntry, relativePath, loopDetected, origin, options) {
      if (!rootEntry || loopDetected) {
        return Promise.resolve([]);
      }
      if (rootEntry.isDirectory) {
        if (rootEntry.isPermissionDenied) {
          return Promise.resolve([]);
        }
        return FsPromise_1.FsPromise.readdir(rootEntry.absolutePath).then((entries) => EntryBuilder_1.EntryBuilder.buildDirEntries(rootEntry, entries, relativePath, origin, options));
      }
      return Promise.resolve([rootEntry]);
    }
    function compareAsync(rootEntry1, rootEntry2, level, relativePath, options, statistics, asyncDiffSet, symlinkCache) {
      const limit = (0, p_limit_1.default)(CONCURRENCY);
      const loopDetected1 = LoopDetector_1.LoopDetector.detectLoop(rootEntry1, symlinkCache.dir1);
      const loopDetected2 = LoopDetector_1.LoopDetector.detectLoop(rootEntry2, symlinkCache.dir2);
      LoopDetector_1.LoopDetector.updateSymlinkCache(symlinkCache, rootEntry1, rootEntry2, loopDetected1, loopDetected2);
      return Promise.all([getEntries(rootEntry1, relativePath, loopDetected1, "left", options), getEntries(rootEntry2, relativePath, loopDetected2, "right", options)]).then((entriesResult) => {
        const entries1 = entriesResult[0];
        const entries2 = entriesResult[1];
        let i1 = 0, i2 = 0;
        const comparePromises = [];
        const fileEqualityAsyncPromises = [];
        while (i1 < entries1.length || i2 < entries2.length) {
          const entry1 = entries1[i1];
          const entry2 = entries2[i2];
          let type1, type2;
          let cmp;
          if (i1 < entries1.length && i2 < entries2.length) {
            cmp = EntryComparator_1.EntryComparator.compareEntry(entry1, entry2, options);
            type1 = EntryType_1.EntryType.getType(entry1);
            type2 = EntryType_1.EntryType.getType(entry2);
          } else if (i1 < entries1.length) {
            type1 = EntryType_1.EntryType.getType(entry1);
            type2 = EntryType_1.EntryType.getType(void 0);
            cmp = -1;
          } else {
            type1 = EntryType_1.EntryType.getType(void 0);
            type2 = EntryType_1.EntryType.getType(entry2);
            cmp = 1;
          }
          if (cmp === 0) {
            const permissionDeniedState = Permission_1.Permission.getPermissionDeniedState(entry1, entry2);
            if (permissionDeniedState === "access-ok") {
              const compareEntryRes = EntryEquality_1.EntryEquality.isEntryEqualAsync(entry1, entry2, type1, asyncDiffSet, options);
              if (compareEntryRes.isSync) {
                options.resultBuilder(entry1, entry2, compareEntryRes.same ? "equal" : "distinct", level, relativePath, options, statistics, asyncDiffSet, compareEntryRes.reason, permissionDeniedState);
                StatisticsUpdate_1.StatisticsUpdate.updateStatisticsBoth(entry1, entry2, compareEntryRes.same, compareEntryRes.reason, type1, permissionDeniedState, statistics, options);
              } else {
                fileEqualityAsyncPromises.push(compareEntryRes.fileEqualityAsyncPromise);
              }
            } else {
              const state = "distinct";
              const reason = "permission-denied";
              const same = false;
              options.resultBuilder(entry1, entry2, state, level, relativePath, options, statistics, asyncDiffSet, reason, permissionDeniedState);
              StatisticsUpdate_1.StatisticsUpdate.updateStatisticsBoth(entry1, entry2, same, reason, type1, permissionDeniedState, statistics, options);
            }
            i1++;
            i2++;
            if (!options.skipSubdirs && type1 === "directory") {
              const subDiffSet = [];
              if (!options.noDiffSet) {
                asyncDiffSet.push(subDiffSet);
              }
              const comparePromise = limit(() => compareAsync(entry1, entry2, level + 1, path_1.default.join(relativePath, entry1.name), options, statistics, subDiffSet, LoopDetector_1.LoopDetector.cloneSymlinkCache(symlinkCache)));
              comparePromises.push(comparePromise);
            }
          } else if (cmp < 0) {
            const permissionDeniedState = Permission_1.Permission.getPermissionDeniedStateWhenRightMissing(entry1);
            options.resultBuilder(entry1, void 0, "left", level, relativePath, options, statistics, asyncDiffSet, void 0, permissionDeniedState);
            StatisticsUpdate_1.StatisticsUpdate.updateStatisticsLeft(entry1, type1, permissionDeniedState, statistics, options);
            i1++;
            if (type1 === "directory" && !options.skipSubdirs) {
              const subDiffSet = [];
              if (!options.noDiffSet) {
                asyncDiffSet.push(subDiffSet);
              }
              const comparePromise = limit(() => compareAsync(entry1, void 0, level + 1, path_1.default.join(relativePath, entry1.name), options, statistics, subDiffSet, LoopDetector_1.LoopDetector.cloneSymlinkCache(symlinkCache)));
              comparePromises.push(comparePromise);
            }
          } else {
            const permissionDeniedState = Permission_1.Permission.getPermissionDeniedStateWhenLeftMissing(entry2);
            options.resultBuilder(void 0, entry2, "right", level, relativePath, options, statistics, asyncDiffSet, void 0, permissionDeniedState);
            StatisticsUpdate_1.StatisticsUpdate.updateStatisticsRight(entry2, type2, permissionDeniedState, statistics, options);
            i2++;
            if (type2 === "directory" && !options.skipSubdirs) {
              const subDiffSet = [];
              if (!options.noDiffSet) {
                asyncDiffSet.push(subDiffSet);
              }
              const comparePromise = limit(() => compareAsync(void 0, entry2, level + 1, path_1.default.join(relativePath, entry2.name), options, statistics, subDiffSet, LoopDetector_1.LoopDetector.cloneSymlinkCache(symlinkCache)));
              comparePromises.push(comparePromise);
            }
          }
        }
        return Promise.all(comparePromises).then(() => Promise.all(fileEqualityAsyncPromises).then((fileEqualityAsyncResults) => {
          for (let i = 0; i < fileEqualityAsyncResults.length; i++) {
            const fileEqualityAsync = fileEqualityAsyncResults[i];
            if (fileEqualityAsync.hasErrors) {
              return Promise.reject(fileEqualityAsync.error);
            }
            const permissionDeniedState = "access-ok";
            options.resultBuilder(fileEqualityAsync.context.entry1, fileEqualityAsync.context.entry2, fileEqualityAsync.same ? "equal" : "distinct", level, relativePath, options, statistics, fileEqualityAsync.context.asyncDiffSet, fileEqualityAsync.reason, permissionDeniedState);
            StatisticsUpdate_1.StatisticsUpdate.updateStatisticsBoth(fileEqualityAsync.context.entry1, fileEqualityAsync.context.entry2, fileEqualityAsync.same, fileEqualityAsync.reason, fileEqualityAsync.context.type1, permissionDeniedState, statistics, options);
          }
        }));
      });
    }
    exports2.compareAsync = compareAsync;
  }
});

// node_modules/dir-compare/build/src/FileSystem/Queue.js
var require_Queue = __commonJS({
  "node_modules/dir-compare/build/src/FileSystem/Queue.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.Queue = void 0;
    var MAX_UNUSED_ARRAY_SIZE = 1e4;
    var Queue = class {
      constructor() {
        this.queue = [];
        this.offset = 0;
      }
      // Returns the length of the queue.
      getLength() {
        return this.queue.length - this.offset;
      }
      /* Enqueues the specified item. The parameter is:
       *
       * item - the item to enqueue
       */
      enqueue(item) {
        this.queue.push(item);
      }
      /* Dequeues an item and returns it. If the queue is empty, the value
       * 'undefined' is returned.
       */
      dequeue() {
        if (this.queue.length === 0) {
          return void 0;
        }
        const item = this.queue[this.offset];
        if (++this.offset > MAX_UNUSED_ARRAY_SIZE) {
          this.queue = this.queue.slice(this.offset);
          this.offset = 0;
        }
        return item;
      }
    };
    exports2.Queue = Queue;
  }
});

// node_modules/dir-compare/build/src/FileSystem/FileDescriptorQueue.js
var require_FileDescriptorQueue = __commonJS({
  "node_modules/dir-compare/build/src/FileSystem/FileDescriptorQueue.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileDescriptorQueue = void 0;
    var fs_1 = __importDefault(require("fs"));
    var Queue_1 = require_Queue();
    var FileDescriptorQueue = class {
      constructor(maxFilesNo) {
        this.maxFilesNo = maxFilesNo;
        this.activeCount = 0;
        this.pendingJobs = new Queue_1.Queue();
      }
      open(path, flags, callback) {
        this.pendingJobs.enqueue({
          path,
          flags,
          callback
        });
        this.process();
      }
      process() {
        if (this.pendingJobs.getLength() > 0 && this.activeCount < this.maxFilesNo) {
          const job = this.pendingJobs.dequeue();
          this.activeCount++;
          fs_1.default.open(job.path, job.flags, job.callback);
        }
      }
      close(fd, callback) {
        this.activeCount--;
        fs_1.default.close(fd, callback);
        this.process();
      }
      openPromise(path, flags) {
        return new Promise((resolve, reject) => {
          this.open(path, flags, (err, fd) => {
            if (err) {
              reject(err);
            } else {
              resolve(fd);
            }
          });
        });
      }
      closePromise(fd) {
        return new Promise((resolve, reject) => {
          this.close(fd, (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
    };
    exports2.FileDescriptorQueue = FileDescriptorQueue;
  }
});

// node_modules/dir-compare/build/src/FileSystem/BufferPool.js
var require_BufferPool = __commonJS({
  "node_modules/dir-compare/build/src/FileSystem/BufferPool.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.BufferPool = void 0;
    var BufferPool = class {
      /**
       *
       * @param bufSize Size of each buffer.
       * @param bufNo Number of buffers. Caller has to make sure no more than bufNo async processes run simultaneously.
       */
      constructor(bufSize, bufNo) {
        this.bufSize = bufSize;
        this.bufNo = bufNo;
        this.bufferPool = [];
        for (let i = 0; i < this.bufNo; i++) {
          this.bufferPool.push({
            buf1: Buffer.alloc(this.bufSize),
            buf2: Buffer.alloc(this.bufSize),
            busy: false
          });
        }
      }
      allocateBuffers() {
        for (let j = 0; j < this.bufNo; j++) {
          const bufferPair = this.bufferPool[j];
          if (!bufferPair.busy) {
            bufferPair.busy = true;
            return bufferPair;
          }
        }
        throw new Error("Async buffer limit reached");
      }
      freeBuffers(bufferPair) {
        bufferPair.busy = false;
      }
    };
    exports2.BufferPool = BufferPool;
  }
});

// node_modules/dir-compare/build/src/FileSystem/FileCloser.js
var require_FileCloser = __commonJS({
  "node_modules/dir-compare/build/src/FileSystem/FileCloser.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FileCloser = void 0;
    var fs_1 = __importDefault(require("fs"));
    function closeFilesSync(fd1, fd2) {
      if (fd1) {
        fs_1.default.closeSync(fd1);
      }
      if (fd2) {
        fs_1.default.closeSync(fd2);
      }
    }
    function closeFilesAsync(fd1, fd2, fdQueue) {
      if (fd1 && fd2) {
        return fdQueue.closePromise(fd1).then(() => fdQueue.closePromise(fd2));
      }
      if (fd1) {
        return fdQueue.closePromise(fd1);
      }
      if (fd2) {
        return fdQueue.closePromise(fd2);
      }
      return Promise.resolve();
    }
    exports2.FileCloser = {
      closeFilesSync,
      closeFilesAsync
    };
  }
});

// node_modules/dir-compare/build/src/FileCompareHandler/default/defaultFileCompare.js
var require_defaultFileCompare = __commonJS({
  "node_modules/dir-compare/build/src/FileCompareHandler/default/defaultFileCompare.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultFileCompare = void 0;
    var fs_1 = __importDefault(require("fs"));
    var FileDescriptorQueue_1 = require_FileDescriptorQueue();
    var BufferPool_1 = require_BufferPool();
    var FileCloser_1 = require_FileCloser();
    var FsPromise_1 = require_FsPromise();
    var MAX_CONCURRENT_FILE_COMPARE = 8;
    var BUF_SIZE = 1e6;
    var fdQueue = new FileDescriptorQueue_1.FileDescriptorQueue(MAX_CONCURRENT_FILE_COMPARE * 2);
    var asyncBufferPool = new BufferPool_1.BufferPool(BUF_SIZE, MAX_CONCURRENT_FILE_COMPARE);
    var syncBufferPool = new BufferPool_1.BufferPool(BUF_SIZE, 2);
    exports2.defaultFileCompare = {
      compareSync,
      compareAsync
    };
    function compareSync(path1, stat1, path2, stat2, options) {
      let fd1;
      let fd2;
      if (stat1.size !== stat2.size) {
        return false;
      }
      const bufferPair = syncBufferPool.allocateBuffers();
      try {
        fd1 = fs_1.default.openSync(path1, "r");
        fd2 = fs_1.default.openSync(path2, "r");
        const buf1 = bufferPair.buf1;
        const buf2 = bufferPair.buf2;
        for (; ; ) {
          const size1 = fs_1.default.readSync(fd1, buf1, 0, BUF_SIZE, null);
          const size2 = fs_1.default.readSync(fd2, buf2, 0, BUF_SIZE, null);
          if (size1 !== size2) {
            return false;
          } else if (size1 === 0) {
            return true;
          } else if (!compareBuffers(buf1, buf2, size1)) {
            return false;
          }
        }
      } finally {
        FileCloser_1.FileCloser.closeFilesSync(fd1, fd2);
        syncBufferPool.freeBuffers(bufferPair);
      }
    }
    function compareAsync(path1, stat1, path2, stat2, options) {
      let fd1;
      let fd2;
      let bufferPair;
      if (stat1.size !== stat2.size) {
        return Promise.resolve(false);
      }
      if (stat1.size < BUF_SIZE && !options.forceAsyncContentCompare) {
        return Promise.resolve(compareSync(path1, stat1, path2, stat2, options));
      }
      return Promise.all([fdQueue.openPromise(path1, "r"), fdQueue.openPromise(path2, "r")]).then((fds) => {
        bufferPair = asyncBufferPool.allocateBuffers();
        fd1 = fds[0];
        fd2 = fds[1];
        const buf1 = bufferPair.buf1;
        const buf2 = bufferPair.buf2;
        const compareAsyncInternal = () => {
          return Promise.all([
            FsPromise_1.FsPromise.read(fd1, buf1, 0, BUF_SIZE, null),
            FsPromise_1.FsPromise.read(fd2, buf2, 0, BUF_SIZE, null)
          ]).then((bufferSizes) => {
            const size1 = bufferSizes[0];
            const size2 = bufferSizes[1];
            if (size1 !== size2) {
              return false;
            } else if (size1 === 0) {
              return true;
            } else if (!compareBuffers(buf1, buf2, size1)) {
              return false;
            } else {
              return compareAsyncInternal();
            }
          });
        };
        return compareAsyncInternal();
      }).then(
        // 'finally' polyfill for node 8 and below
        (res) => finalizeAsync(fd1, fd2, bufferPair).then(() => res),
        (err) => finalizeAsync(fd1, fd2, bufferPair).then(() => {
          throw err;
        })
      );
    }
    function compareBuffers(buf1, buf2, contentSize) {
      return buf1.slice(0, contentSize).equals(buf2.slice(0, contentSize));
    }
    function finalizeAsync(fd1, fd2, bufferPair) {
      if (bufferPair) {
        asyncBufferPool.freeBuffers(bufferPair);
      }
      return FileCloser_1.FileCloser.closeFilesAsync(fd1, fd2, fdQueue);
    }
  }
});

// node_modules/dir-compare/build/src/FileCompareHandler/lines/LineBasedCompareContext.js
var require_LineBasedCompareContext = __commonJS({
  "node_modules/dir-compare/build/src/FileCompareHandler/lines/LineBasedCompareContext.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.LineBasedCompareContext = void 0;
    var LineBasedCompareContext = class {
      constructor(fd1, fd2, bufferPair) {
        this.rest = { rest1: "", rest2: "" };
        this.restLines = { restLines1: [], restLines2: [] };
        this.fd1 = fd1;
        this.fd2 = fd2;
        this.buffer = bufferPair;
      }
    };
    exports2.LineBasedCompareContext = LineBasedCompareContext;
  }
});

// node_modules/dir-compare/build/src/FileCompareHandler/lines/compare/compareLines.js
var require_compareLines = __commonJS({
  "node_modules/dir-compare/build/src/FileCompareHandler/lines/compare/compareLines.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.compareLines = void 0;
    var TRIM_WHITE_SPACES_REGEXP = /^[ \f\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+|[ \f\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+$/g;
    var TRIM_LINE_ENDING_REGEXP = /\r\n|\n$/g;
    var REMOVE_WHITE_SPACES_REGEXP = /[ \f\t\v\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]/g;
    function compareLines(lines1, lines2, options) {
      if (options.ignoreEmptyLines) {
        lines1 = removeEmptyLines(lines1);
        lines2 = removeEmptyLines(lines2);
      }
      const len = Math.min(lines1.length, lines2.length);
      let i = 0;
      for (; i < len; i++) {
        const isEqual = compareLine(options, lines1[i], lines2[i]);
        if (!isEqual) {
          return { isEqual: false, restLines1: [], restLines2: [] };
        }
      }
      return {
        isEqual: true,
        restLines1: lines1.slice(i),
        restLines2: lines2.slice(i)
      };
    }
    exports2.compareLines = compareLines;
    function compareLine(options, line1, line2) {
      if (options.ignoreLineEnding) {
        line1 = trimLineEnding(line1);
        line2 = trimLineEnding(line2);
      }
      if (options.ignoreWhiteSpaces) {
        line1 = trimSpaces(line1);
        line2 = trimSpaces(line2);
      }
      if (options.ignoreAllWhiteSpaces) {
        line1 = removeSpaces(line1);
        line2 = removeSpaces(line2);
      }
      return line1 === line2;
    }
    function trimSpaces(s) {
      const { content, lineEnding } = separateEol(s);
      const trimmed = content.replace(TRIM_WHITE_SPACES_REGEXP, "");
      return trimmed + lineEnding;
    }
    function trimLineEnding(s) {
      return s.replace(TRIM_LINE_ENDING_REGEXP, "");
    }
    function removeSpaces(s) {
      return s.replace(REMOVE_WHITE_SPACES_REGEXP, "");
    }
    function removeEmptyLines(lines) {
      return lines.filter((line) => !isEmptyLine(line));
    }
    function isEmptyLine(line) {
      return line === "\n" || line === "\r\n";
    }
    function separateEol(s) {
      const len = s.length;
      let lineEnding = "";
      let content = s;
      if (s[len - 1] === "\n") {
        if (s[len - 2] === "\r") {
          return {
            lineEnding: "\r\n",
            content: s.slice(0, len - 2)
          };
        }
        {
          lineEnding = "\n";
          content = s.slice(0, len - 1);
        }
      }
      return { content, lineEnding };
    }
  }
});

// node_modules/dir-compare/build/src/FileCompareHandler/lines/compare/compareLineBatches.js
var require_compareLineBatches = __commonJS({
  "node_modules/dir-compare/build/src/FileCompareHandler/lines/compare/compareLineBatches.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.compareLineBatches = void 0;
    var compareLines_1 = require_compareLines();
    function compareLineBatches(lineBatch1, lineBatch2, options) {
      const compareResult = (0, compareLines_1.compareLines)(lineBatch1.lines, lineBatch2.lines, options);
      if (!compareResult.isEqual) {
        return { batchIsEqual: false, reachedEof: false, restLines: emptyRestLines() };
      }
      const reachedEof = lineBatch1.reachedEof && lineBatch2.reachedEof;
      const hasMoreLinesToProcess = compareResult.restLines1.length > 0 || compareResult.restLines2.length > 0;
      if (reachedEof && hasMoreLinesToProcess) {
        return { batchIsEqual: false, reachedEof: true, restLines: emptyRestLines() };
      }
      if (reachedEof) {
        return { batchIsEqual: true, reachedEof: true, restLines: emptyRestLines() };
      }
      return {
        batchIsEqual: true,
        reachedEof: false,
        restLines: {
          restLines1: compareResult.restLines1,
          restLines2: compareResult.restLines2
        }
      };
    }
    exports2.compareLineBatches = compareLineBatches;
    function emptyRestLines() {
      return {
        restLines1: [],
        restLines2: []
      };
    }
  }
});

// node_modules/dir-compare/build/src/FileCompareHandler/lines/lineReader/readBufferedLines.js
var require_readBufferedLines = __commonJS({
  "node_modules/dir-compare/build/src/FileCompareHandler/lines/lineReader/readBufferedLines.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.readBufferedLines = void 0;
    var LINE_TOKENIZER_REGEXP = /[^\n]+\n?|\n/g;
    function readBufferedLines(buf, size, allocatedBufferSize, rest, restLines) {
      if (size === 0 && rest.length === 0) {
        return { lines: [...restLines], rest: "", reachedEof: true };
      }
      if (size === 0) {
        return { lines: [...restLines, rest], rest: "", reachedEof: true };
      }
      const fileContent = rest + buf.toString("utf8", 0, size);
      const lines = [...restLines, ...fileContent.match(LINE_TOKENIZER_REGEXP)];
      const reachedEof = size < allocatedBufferSize;
      if (reachedEof) {
        return {
          lines,
          rest: "",
          reachedEof: true
        };
      }
      return removeLastLine(lines);
    }
    exports2.readBufferedLines = readBufferedLines;
    function removeLastLine(lines) {
      const lastLine = lines[lines.length - 1];
      return {
        lines: lines.slice(0, lines.length - 1),
        rest: lastLine,
        reachedEof: false
      };
    }
  }
});

// node_modules/dir-compare/build/src/FileCompareHandler/lines/lineBasedCompareSync.js
var require_lineBasedCompareSync = __commonJS({
  "node_modules/dir-compare/build/src/FileCompareHandler/lines/lineBasedCompareSync.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.lineBasedCompareSync = void 0;
    var fs_1 = __importDefault(require("fs"));
    var LineBasedCompareContext_1 = require_LineBasedCompareContext();
    var compareLineBatches_1 = require_compareLineBatches();
    var readBufferedLines_1 = require_readBufferedLines();
    var FileCloser_1 = require_FileCloser();
    var BUF_SIZE = 1e5;
    var bufferPair = {
      buf1: Buffer.alloc(BUF_SIZE),
      buf2: Buffer.alloc(BUF_SIZE),
      busy: true
    };
    var lineBasedCompareSync = (path1, stat1, path2, stat2, options) => {
      var _a;
      const bufferSize = Math.min(BUF_SIZE, (_a = options.lineBasedHandlerBufferSize) !== null && _a !== void 0 ? _a : Number.MAX_VALUE);
      let context;
      try {
        context = new LineBasedCompareContext_1.LineBasedCompareContext(fs_1.default.openSync(path1, "r"), fs_1.default.openSync(path2, "r"), bufferPair);
        for (; ; ) {
          const lineBatch1 = readLineBatchSync(context.fd1, context.buffer.buf1, bufferSize, context.rest.rest1, context.restLines.restLines1);
          const lineBatch2 = readLineBatchSync(context.fd2, context.buffer.buf2, bufferSize, context.rest.rest2, context.restLines.restLines2);
          context.rest.rest1 = lineBatch1.rest;
          context.rest.rest2 = lineBatch2.rest;
          const compareResult = (0, compareLineBatches_1.compareLineBatches)(lineBatch1, lineBatch2, options);
          if (!compareResult.batchIsEqual) {
            return false;
          }
          if (compareResult.reachedEof) {
            return compareResult.batchIsEqual;
          }
          context.restLines.restLines1 = compareResult.restLines.restLines1;
          context.restLines.restLines2 = compareResult.restLines.restLines2;
        }
      } finally {
        FileCloser_1.FileCloser.closeFilesSync(context === null || context === void 0 ? void 0 : context.fd1, context === null || context === void 0 ? void 0 : context.fd2);
      }
    };
    exports2.lineBasedCompareSync = lineBasedCompareSync;
    function readLineBatchSync(fd, buf, bufferSize, rest, restLines) {
      const size = fs_1.default.readSync(fd, buf, 0, bufferSize, null);
      return (0, readBufferedLines_1.readBufferedLines)(buf, size, bufferSize, rest, restLines);
    }
  }
});

// node_modules/dir-compare/build/src/FileCompareHandler/lines/lineBasedCompareAsync.js
var require_lineBasedCompareAsync = __commonJS({
  "node_modules/dir-compare/build/src/FileCompareHandler/lines/lineBasedCompareAsync.js"(exports2) {
    "use strict";
    var __awaiter2 = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.lineBasedCompareAsync = void 0;
    var FileDescriptorQueue_1 = require_FileDescriptorQueue();
    var LineBasedCompareContext_1 = require_LineBasedCompareContext();
    var BufferPool_1 = require_BufferPool();
    var compareLineBatches_1 = require_compareLineBatches();
    var readBufferedLines_1 = require_readBufferedLines();
    var FileCloser_1 = require_FileCloser();
    var FsPromise_1 = require_FsPromise();
    var BUF_SIZE = 1e5;
    var MAX_CONCURRENT_FILE_COMPARE = 8;
    var fdQueue = new FileDescriptorQueue_1.FileDescriptorQueue(MAX_CONCURRENT_FILE_COMPARE * 2);
    var bufferPool = new BufferPool_1.BufferPool(BUF_SIZE, MAX_CONCURRENT_FILE_COMPARE);
    var lineBasedCompareAsync = (path1, stat1, path2, stat2, options) => __awaiter2(void 0, void 0, void 0, function* () {
      var _a;
      const bufferSize = Math.min(BUF_SIZE, (_a = options.lineBasedHandlerBufferSize) !== null && _a !== void 0 ? _a : Number.MAX_VALUE);
      let context;
      try {
        const fileDescriptors = yield Promise.all([fdQueue.openPromise(path1, "r"), fdQueue.openPromise(path2, "r")]);
        context = new LineBasedCompareContext_1.LineBasedCompareContext(fileDescriptors[0], fileDescriptors[1], bufferPool.allocateBuffers());
        for (; ; ) {
          const lineBatch1 = yield readLineBatchAsync(context.fd1, context.buffer.buf1, bufferSize, context.rest.rest1, context.restLines.restLines1);
          const lineBatch2 = yield readLineBatchAsync(context.fd2, context.buffer.buf2, bufferSize, context.rest.rest2, context.restLines.restLines2);
          context.rest.rest1 = lineBatch1.rest;
          context.rest.rest2 = lineBatch2.rest;
          const compareResult = (0, compareLineBatches_1.compareLineBatches)(lineBatch1, lineBatch2, options);
          if (!compareResult.batchIsEqual) {
            return false;
          }
          if (compareResult.reachedEof) {
            return compareResult.batchIsEqual;
          }
          context.restLines.restLines1 = compareResult.restLines.restLines1;
          context.restLines.restLines2 = compareResult.restLines.restLines2;
        }
      } finally {
        if (context) {
          bufferPool.freeBuffers(context.buffer);
          yield FileCloser_1.FileCloser.closeFilesAsync(context.fd1, context.fd2, fdQueue);
        }
      }
    });
    exports2.lineBasedCompareAsync = lineBasedCompareAsync;
    function readLineBatchAsync(fd, buf, bufferSize, rest, restLines) {
      return __awaiter2(this, void 0, void 0, function* () {
        const size = yield FsPromise_1.FsPromise.read(fd, buf, 0, bufferSize, null);
        return (0, readBufferedLines_1.readBufferedLines)(buf, size, bufferSize, rest, restLines);
      });
    }
  }
});

// node_modules/dir-compare/build/src/FileCompareHandler/lines/lineBasedFileCompare.js
var require_lineBasedFileCompare = __commonJS({
  "node_modules/dir-compare/build/src/FileCompareHandler/lines/lineBasedFileCompare.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.lineBasedFileCompare = void 0;
    var lineBasedCompareSync_1 = require_lineBasedCompareSync();
    var lineBasedCompareAsync_1 = require_lineBasedCompareAsync();
    exports2.lineBasedFileCompare = {
      compareSync: lineBasedCompareSync_1.lineBasedCompareSync,
      compareAsync: lineBasedCompareAsync_1.lineBasedCompareAsync
    };
  }
});

// node_modules/dir-compare/build/src/NameCompare/defaultNameCompare.js
var require_defaultNameCompare = __commonJS({
  "node_modules/dir-compare/build/src/NameCompare/defaultNameCompare.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultNameCompare = void 0;
    var defaultNameCompare = (name1, name2, options) => {
      if (options.ignoreCase) {
        name1 = name1.toLowerCase();
        name2 = name2.toLowerCase();
      }
      return strcmp(name1, name2);
    };
    exports2.defaultNameCompare = defaultNameCompare;
    function strcmp(str1, str2) {
      return str1 === str2 ? 0 : str1 > str2 ? 1 : -1;
    }
  }
});

// node_modules/dir-compare/build/src/Statistics/StatisticsLifecycle.js
var require_StatisticsLifecycle = __commonJS({
  "node_modules/dir-compare/build/src/Statistics/StatisticsLifecycle.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.StatisticsLifecycle = void 0;
    exports2.StatisticsLifecycle = {
      initStats(options) {
        let symlinkStatistics = void 0;
        if (options.compareSymlink) {
          symlinkStatistics = {
            distinctSymlinks: 0,
            equalSymlinks: 0,
            leftSymlinks: 0,
            rightSymlinks: 0,
            differencesSymlinks: 0,
            totalSymlinks: 0
          };
        }
        const brokenLinksStatistics = {
          leftBrokenLinks: 0,
          rightBrokenLinks: 0,
          distinctBrokenLinks: 0,
          totalBrokenLinks: 0
        };
        const permissionDeniedStatistics = {
          leftPermissionDenied: 0,
          rightPermissionDenied: 0,
          distinctPermissionDenied: 0,
          totalPermissionDenied: 0
        };
        return {
          distinct: 0,
          equal: 0,
          left: 0,
          right: 0,
          distinctFiles: 0,
          equalFiles: 0,
          leftFiles: 0,
          rightFiles: 0,
          distinctDirs: 0,
          equalDirs: 0,
          leftDirs: 0,
          rightDirs: 0,
          brokenLinks: brokenLinksStatistics,
          symlinks: symlinkStatistics,
          permissionDenied: permissionDeniedStatistics
        };
      },
      completeStatistics(initialStatistics, options) {
        const statistics = JSON.parse(JSON.stringify(initialStatistics));
        statistics.differences = statistics.distinct + statistics.left + statistics.right;
        statistics.differencesFiles = statistics.distinctFiles + statistics.leftFiles + statistics.rightFiles;
        statistics.differencesDirs = statistics.distinctDirs + statistics.leftDirs + statistics.rightDirs;
        statistics.total = statistics.equal + statistics.differences;
        statistics.totalFiles = statistics.equalFiles + statistics.differencesFiles;
        statistics.totalDirs = statistics.equalDirs + statistics.differencesDirs;
        const brokenLInksStats = statistics.brokenLinks;
        brokenLInksStats.totalBrokenLinks = brokenLInksStats.leftBrokenLinks + brokenLInksStats.rightBrokenLinks + brokenLInksStats.distinctBrokenLinks;
        const permissionDeniedStats = statistics.permissionDenied;
        permissionDeniedStats.totalPermissionDenied = permissionDeniedStats.leftPermissionDenied + permissionDeniedStats.rightPermissionDenied + permissionDeniedStats.distinctPermissionDenied;
        statistics.same = statistics.differences ? false : true;
        if (options.compareSymlink) {
          const symlinkStatistics = statistics.symlinks;
          symlinkStatistics.differencesSymlinks = symlinkStatistics.distinctSymlinks + symlinkStatistics.leftSymlinks + symlinkStatistics.rightSymlinks;
          symlinkStatistics.totalSymlinks = symlinkStatistics.differencesSymlinks + symlinkStatistics.equalSymlinks;
        }
        return statistics;
      }
    };
  }
});

// node_modules/dir-compare/build/src/ResultBuilder/defaultResultBuilderCallback.js
var require_defaultResultBuilderCallback = __commonJS({
  "node_modules/dir-compare/build/src/ResultBuilder/defaultResultBuilderCallback.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultResultBuilderCallback = void 0;
    var path_1 = __importDefault(require("path"));
    var EntryType_1 = require_EntryType();
    function defaultResultBuilderCallback(entry1, entry2, state, level, relativePath, options, statistics, diffSet, reason, permissionDeniedState) {
      if (options.noDiffSet) {
        return;
      }
      diffSet.push({
        path1: entry1 ? path_1.default.dirname(entry1.path) : void 0,
        path2: entry2 ? path_1.default.dirname(entry2.path) : void 0,
        relativePath,
        name1: entry1 ? entry1.name : void 0,
        name2: entry2 ? entry2.name : void 0,
        state,
        permissionDeniedState,
        type1: EntryType_1.EntryType.getType(entry1),
        type2: EntryType_1.EntryType.getType(entry2),
        level,
        size1: entry1 ? entry1.stat.size : void 0,
        size2: entry2 ? entry2.stat.size : void 0,
        date1: entry1 ? entry1.stat.mtime : void 0,
        date2: entry2 ? entry2.stat.mtime : void 0,
        reason
      });
    }
    exports2.defaultResultBuilderCallback = defaultResultBuilderCallback;
  }
});

// node_modules/dir-compare/build/src/NameCompare/fileBasedNameCompare.js
var require_fileBasedNameCompare = __commonJS({
  "node_modules/dir-compare/build/src/NameCompare/fileBasedNameCompare.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.fileBasedNameCompare = void 0;
    function fileBasedNameCompare(name1, name2, options) {
      return 0;
    }
    exports2.fileBasedNameCompare = fileBasedNameCompare;
  }
});

// node_modules/concat-map/index.js
var require_concat_map = __commonJS({
  "node_modules/concat-map/index.js"(exports2, module2) {
    module2.exports = function(xs, fn) {
      var res = [];
      for (var i = 0; i < xs.length; i++) {
        var x = fn(xs[i], i);
        if (isArray(x))
          res.push.apply(res, x);
        else
          res.push(x);
      }
      return res;
    };
    var isArray = Array.isArray || function(xs) {
      return Object.prototype.toString.call(xs) === "[object Array]";
    };
  }
});

// node_modules/balanced-match/index.js
var require_balanced_match = __commonJS({
  "node_modules/balanced-match/index.js"(exports2, module2) {
    "use strict";
    module2.exports = balanced;
    function balanced(a, b, str) {
      if (a instanceof RegExp)
        a = maybeMatch(a, str);
      if (b instanceof RegExp)
        b = maybeMatch(b, str);
      var r = range(a, b, str);
      return r && {
        start: r[0],
        end: r[1],
        pre: str.slice(0, r[0]),
        body: str.slice(r[0] + a.length, r[1]),
        post: str.slice(r[1] + b.length)
      };
    }
    function maybeMatch(reg, str) {
      var m = str.match(reg);
      return m ? m[0] : null;
    }
    balanced.range = range;
    function range(a, b, str) {
      var begs, beg, left, right, result;
      var ai = str.indexOf(a);
      var bi = str.indexOf(b, ai + 1);
      var i = ai;
      if (ai >= 0 && bi > 0) {
        if (a === b) {
          return [ai, bi];
        }
        begs = [];
        left = str.length;
        while (i >= 0 && !result) {
          if (i == ai) {
            begs.push(i);
            ai = str.indexOf(a, i + 1);
          } else if (begs.length == 1) {
            result = [begs.pop(), bi];
          } else {
            beg = begs.pop();
            if (beg < left) {
              left = beg;
              right = bi;
            }
            bi = str.indexOf(b, i + 1);
          }
          i = ai < bi && ai >= 0 ? ai : bi;
        }
        if (begs.length) {
          result = [left, right];
        }
      }
      return result;
    }
  }
});

// node_modules/brace-expansion/index.js
var require_brace_expansion = __commonJS({
  "node_modules/brace-expansion/index.js"(exports2, module2) {
    var concatMap = require_concat_map();
    var balanced = require_balanced_match();
    module2.exports = expandTop;
    var escSlash = "\0SLASH" + Math.random() + "\0";
    var escOpen = "\0OPEN" + Math.random() + "\0";
    var escClose = "\0CLOSE" + Math.random() + "\0";
    var escComma = "\0COMMA" + Math.random() + "\0";
    var escPeriod = "\0PERIOD" + Math.random() + "\0";
    function numeric(str) {
      return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
    }
    function escapeBraces(str) {
      return str.split("\\\\").join(escSlash).split("\\{").join(escOpen).split("\\}").join(escClose).split("\\,").join(escComma).split("\\.").join(escPeriod);
    }
    function unescapeBraces(str) {
      return str.split(escSlash).join("\\").split(escOpen).join("{").split(escClose).join("}").split(escComma).join(",").split(escPeriod).join(".");
    }
    function parseCommaParts(str) {
      if (!str)
        return [""];
      var parts = [];
      var m = balanced("{", "}", str);
      if (!m)
        return str.split(",");
      var pre = m.pre;
      var body = m.body;
      var post = m.post;
      var p = pre.split(",");
      p[p.length - 1] += "{" + body + "}";
      var postParts = parseCommaParts(post);
      if (post.length) {
        p[p.length - 1] += postParts.shift();
        p.push.apply(p, postParts);
      }
      parts.push.apply(parts, p);
      return parts;
    }
    function expandTop(str) {
      if (!str)
        return [];
      if (str.substr(0, 2) === "{}") {
        str = "\\{\\}" + str.substr(2);
      }
      return expand(escapeBraces(str), true).map(unescapeBraces);
    }
    function embrace(str) {
      return "{" + str + "}";
    }
    function isPadded(el) {
      return /^-?0\d/.test(el);
    }
    function lte(i, y) {
      return i <= y;
    }
    function gte(i, y) {
      return i >= y;
    }
    function expand(str, isTop) {
      var expansions = [];
      var m = balanced("{", "}", str);
      if (!m || /\$$/.test(m.pre))
        return [str];
      var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body);
      var isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body);
      var isSequence = isNumericSequence || isAlphaSequence;
      var isOptions = m.body.indexOf(",") >= 0;
      if (!isSequence && !isOptions) {
        if (m.post.match(/,(?!,).*\}/)) {
          str = m.pre + "{" + m.body + escClose + m.post;
          return expand(str);
        }
        return [str];
      }
      var n;
      if (isSequence) {
        n = m.body.split(/\.\./);
      } else {
        n = parseCommaParts(m.body);
        if (n.length === 1) {
          n = expand(n[0], false).map(embrace);
          if (n.length === 1) {
            var post = m.post.length ? expand(m.post, false) : [""];
            return post.map(function(p) {
              return m.pre + n[0] + p;
            });
          }
        }
      }
      var pre = m.pre;
      var post = m.post.length ? expand(m.post, false) : [""];
      var N;
      if (isSequence) {
        var x = numeric(n[0]);
        var y = numeric(n[1]);
        var width = Math.max(n[0].length, n[1].length);
        var incr = n.length == 3 ? Math.abs(numeric(n[2])) : 1;
        var test = lte;
        var reverse = y < x;
        if (reverse) {
          incr *= -1;
          test = gte;
        }
        var pad = n.some(isPadded);
        N = [];
        for (var i = x; test(i, y); i += incr) {
          var c;
          if (isAlphaSequence) {
            c = String.fromCharCode(i);
            if (c === "\\")
              c = "";
          } else {
            c = String(i);
            if (pad) {
              var need = width - c.length;
              if (need > 0) {
                var z = new Array(need + 1).join("0");
                if (i < 0)
                  c = "-" + z + c.slice(1);
                else
                  c = z + c;
              }
            }
          }
          N.push(c);
        }
      } else {
        N = concatMap(n, function(el) {
          return expand(el, false);
        });
      }
      for (var j = 0; j < N.length; j++) {
        for (var k = 0; k < post.length; k++) {
          var expansion = pre + N[j] + post[k];
          if (!isTop || isSequence || expansion)
            expansions.push(expansion);
        }
      }
      return expansions;
    }
  }
});

// node_modules/minimatch/minimatch.js
var require_minimatch = __commonJS({
  "node_modules/minimatch/minimatch.js"(exports2, module2) {
    module2.exports = minimatch;
    minimatch.Minimatch = Minimatch;
    var path = function() {
      try {
        return require("path");
      } catch (e) {
      }
    }() || {
      sep: "/"
    };
    minimatch.sep = path.sep;
    var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {};
    var expand = require_brace_expansion();
    var plTypes = {
      "!": { open: "(?:(?!(?:", close: "))[^/]*?)" },
      "?": { open: "(?:", close: ")?" },
      "+": { open: "(?:", close: ")+" },
      "*": { open: "(?:", close: ")*" },
      "@": { open: "(?:", close: ")" }
    };
    var qmark = "[^/]";
    var star = qmark + "*?";
    var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
    var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
    var reSpecials = charSet("().*{}+?[]^$\\!");
    function charSet(s) {
      return s.split("").reduce(function(set, c) {
        set[c] = true;
        return set;
      }, {});
    }
    var slashSplit = /\/+/;
    minimatch.filter = filter;
    function filter(pattern, options) {
      options = options || {};
      return function(p, i, list) {
        return minimatch(p, pattern, options);
      };
    }
    function ext(a, b) {
      b = b || {};
      var t = {};
      Object.keys(a).forEach(function(k) {
        t[k] = a[k];
      });
      Object.keys(b).forEach(function(k) {
        t[k] = b[k];
      });
      return t;
    }
    minimatch.defaults = function(def) {
      if (!def || typeof def !== "object" || !Object.keys(def).length) {
        return minimatch;
      }
      var orig = minimatch;
      var m = function minimatch2(p, pattern, options) {
        return orig(p, pattern, ext(def, options));
      };
      m.Minimatch = function Minimatch2(pattern, options) {
        return new orig.Minimatch(pattern, ext(def, options));
      };
      m.Minimatch.defaults = function defaults(options) {
        return orig.defaults(ext(def, options)).Minimatch;
      };
      m.filter = function filter2(pattern, options) {
        return orig.filter(pattern, ext(def, options));
      };
      m.defaults = function defaults(options) {
        return orig.defaults(ext(def, options));
      };
      m.makeRe = function makeRe2(pattern, options) {
        return orig.makeRe(pattern, ext(def, options));
      };
      m.braceExpand = function braceExpand2(pattern, options) {
        return orig.braceExpand(pattern, ext(def, options));
      };
      m.match = function(list, pattern, options) {
        return orig.match(list, pattern, ext(def, options));
      };
      return m;
    };
    Minimatch.defaults = function(def) {
      return minimatch.defaults(def).Minimatch;
    };
    function minimatch(p, pattern, options) {
      assertValidPattern(pattern);
      if (!options)
        options = {};
      if (!options.nocomment && pattern.charAt(0) === "#") {
        return false;
      }
      return new Minimatch(pattern, options).match(p);
    }
    function Minimatch(pattern, options) {
      if (!(this instanceof Minimatch)) {
        return new Minimatch(pattern, options);
      }
      assertValidPattern(pattern);
      if (!options)
        options = {};
      pattern = pattern.trim();
      if (!options.allowWindowsEscape && path.sep !== "/") {
        pattern = pattern.split(path.sep).join("/");
      }
      this.options = options;
      this.set = [];
      this.pattern = pattern;
      this.regexp = null;
      this.negate = false;
      this.comment = false;
      this.empty = false;
      this.partial = !!options.partial;
      this.make();
    }
    Minimatch.prototype.debug = function() {
    };
    Minimatch.prototype.make = make;
    function make() {
      var pattern = this.pattern;
      var options = this.options;
      if (!options.nocomment && pattern.charAt(0) === "#") {
        this.comment = true;
        return;
      }
      if (!pattern) {
        this.empty = true;
        return;
      }
      this.parseNegate();
      var set = this.globSet = this.braceExpand();
      if (options.debug)
        this.debug = function debug() {
          console.error.apply(console, arguments);
        };
      this.debug(this.pattern, set);
      set = this.globParts = set.map(function(s) {
        return s.split(slashSplit);
      });
      this.debug(this.pattern, set);
      set = set.map(function(s, si, set2) {
        return s.map(this.parse, this);
      }, this);
      this.debug(this.pattern, set);
      set = set.filter(function(s) {
        return s.indexOf(false) === -1;
      });
      this.debug(this.pattern, set);
      this.set = set;
    }
    Minimatch.prototype.parseNegate = parseNegate;
    function parseNegate() {
      var pattern = this.pattern;
      var negate = false;
      var options = this.options;
      var negateOffset = 0;
      if (options.nonegate)
        return;
      for (var i = 0, l = pattern.length; i < l && pattern.charAt(i) === "!"; i++) {
        negate = !negate;
        negateOffset++;
      }
      if (negateOffset)
        this.pattern = pattern.substr(negateOffset);
      this.negate = negate;
    }
    minimatch.braceExpand = function(pattern, options) {
      return braceExpand(pattern, options);
    };
    Minimatch.prototype.braceExpand = braceExpand;
    function braceExpand(pattern, options) {
      if (!options) {
        if (this instanceof Minimatch) {
          options = this.options;
        } else {
          options = {};
        }
      }
      pattern = typeof pattern === "undefined" ? this.pattern : pattern;
      assertValidPattern(pattern);
      if (options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern)) {
        return [pattern];
      }
      return expand(pattern);
    }
    var MAX_PATTERN_LENGTH = 1024 * 64;
    var assertValidPattern = function(pattern) {
      if (typeof pattern !== "string") {
        throw new TypeError("invalid pattern");
      }
      if (pattern.length > MAX_PATTERN_LENGTH) {
        throw new TypeError("pattern is too long");
      }
    };
    Minimatch.prototype.parse = parse;
    var SUBPARSE = {};
    function parse(pattern, isSub) {
      assertValidPattern(pattern);
      var options = this.options;
      if (pattern === "**") {
        if (!options.noglobstar)
          return GLOBSTAR;
        else
          pattern = "*";
      }
      if (pattern === "")
        return "";
      var re = "";
      var hasMagic = !!options.nocase;
      var escaping = false;
      var patternListStack = [];
      var negativeLists = [];
      var stateChar;
      var inClass = false;
      var reClassStart = -1;
      var classStart = -1;
      var patternStart = pattern.charAt(0) === "." ? "" : options.dot ? "(?!(?:^|\\/)\\.{1,2}(?:$|\\/))" : "(?!\\.)";
      var self2 = this;
      function clearStateChar() {
        if (stateChar) {
          switch (stateChar) {
            case "*":
              re += star;
              hasMagic = true;
              break;
            case "?":
              re += qmark;
              hasMagic = true;
              break;
            default:
              re += "\\" + stateChar;
              break;
          }
          self2.debug("clearStateChar %j %j", stateChar, re);
          stateChar = false;
        }
      }
      for (var i = 0, len = pattern.length, c; i < len && (c = pattern.charAt(i)); i++) {
        this.debug("%s	%s %s %j", pattern, i, re, c);
        if (escaping && reSpecials[c]) {
          re += "\\" + c;
          escaping = false;
          continue;
        }
        switch (c) {
          case "/": {
            return false;
          }
          case "\\":
            clearStateChar();
            escaping = true;
            continue;
          case "?":
          case "*":
          case "+":
          case "@":
          case "!":
            this.debug("%s	%s %s %j <-- stateChar", pattern, i, re, c);
            if (inClass) {
              this.debug("  in class");
              if (c === "!" && i === classStart + 1)
                c = "^";
              re += c;
              continue;
            }
            self2.debug("call clearStateChar %j", stateChar);
            clearStateChar();
            stateChar = c;
            if (options.noext)
              clearStateChar();
            continue;
          case "(":
            if (inClass) {
              re += "(";
              continue;
            }
            if (!stateChar) {
              re += "\\(";
              continue;
            }
            patternListStack.push({
              type: stateChar,
              start: i - 1,
              reStart: re.length,
              open: plTypes[stateChar].open,
              close: plTypes[stateChar].close
            });
            re += stateChar === "!" ? "(?:(?!(?:" : "(?:";
            this.debug("plType %j %j", stateChar, re);
            stateChar = false;
            continue;
          case ")":
            if (inClass || !patternListStack.length) {
              re += "\\)";
              continue;
            }
            clearStateChar();
            hasMagic = true;
            var pl = patternListStack.pop();
            re += pl.close;
            if (pl.type === "!") {
              negativeLists.push(pl);
            }
            pl.reEnd = re.length;
            continue;
          case "|":
            if (inClass || !patternListStack.length || escaping) {
              re += "\\|";
              escaping = false;
              continue;
            }
            clearStateChar();
            re += "|";
            continue;
          case "[":
            clearStateChar();
            if (inClass) {
              re += "\\" + c;
              continue;
            }
            inClass = true;
            classStart = i;
            reClassStart = re.length;
            re += c;
            continue;
          case "]":
            if (i === classStart + 1 || !inClass) {
              re += "\\" + c;
              escaping = false;
              continue;
            }
            var cs = pattern.substring(classStart + 1, i);
            try {
              RegExp("[" + cs + "]");
            } catch (er) {
              var sp = this.parse(cs, SUBPARSE);
              re = re.substr(0, reClassStart) + "\\[" + sp[0] + "\\]";
              hasMagic = hasMagic || sp[1];
              inClass = false;
              continue;
            }
            hasMagic = true;
            inClass = false;
            re += c;
            continue;
          default:
            clearStateChar();
            if (escaping) {
              escaping = false;
            } else if (reSpecials[c] && !(c === "^" && inClass)) {
              re += "\\";
            }
            re += c;
        }
      }
      if (inClass) {
        cs = pattern.substr(classStart + 1);
        sp = this.parse(cs, SUBPARSE);
        re = re.substr(0, reClassStart) + "\\[" + sp[0];
        hasMagic = hasMagic || sp[1];
      }
      for (pl = patternListStack.pop(); pl; pl = patternListStack.pop()) {
        var tail = re.slice(pl.reStart + pl.open.length);
        this.debug("setting tail", re, pl);
        tail = tail.replace(/((?:\\{2}){0,64})(\\?)\|/g, function(_, $1, $2) {
          if (!$2) {
            $2 = "\\";
          }
          return $1 + $1 + $2 + "|";
        });
        this.debug("tail=%j\n   %s", tail, tail, pl, re);
        var t = pl.type === "*" ? star : pl.type === "?" ? qmark : "\\" + pl.type;
        hasMagic = true;
        re = re.slice(0, pl.reStart) + t + "\\(" + tail;
      }
      clearStateChar();
      if (escaping) {
        re += "\\\\";
      }
      var addPatternStart = false;
      switch (re.charAt(0)) {
        case "[":
        case ".":
        case "(":
          addPatternStart = true;
      }
      for (var n = negativeLists.length - 1; n > -1; n--) {
        var nl = negativeLists[n];
        var nlBefore = re.slice(0, nl.reStart);
        var nlFirst = re.slice(nl.reStart, nl.reEnd - 8);
        var nlLast = re.slice(nl.reEnd - 8, nl.reEnd);
        var nlAfter = re.slice(nl.reEnd);
        nlLast += nlAfter;
        var openParensBefore = nlBefore.split("(").length - 1;
        var cleanAfter = nlAfter;
        for (i = 0; i < openParensBefore; i++) {
          cleanAfter = cleanAfter.replace(/\)[+*?]?/, "");
        }
        nlAfter = cleanAfter;
        var dollar = "";
        if (nlAfter === "" && isSub !== SUBPARSE) {
          dollar = "$";
        }
        var newRe = nlBefore + nlFirst + nlAfter + dollar + nlLast;
        re = newRe;
      }
      if (re !== "" && hasMagic) {
        re = "(?=.)" + re;
      }
      if (addPatternStart) {
        re = patternStart + re;
      }
      if (isSub === SUBPARSE) {
        return [re, hasMagic];
      }
      if (!hasMagic) {
        return globUnescape(pattern);
      }
      var flags = options.nocase ? "i" : "";
      try {
        var regExp = new RegExp("^" + re + "$", flags);
      } catch (er) {
        return new RegExp("$.");
      }
      regExp._glob = pattern;
      regExp._src = re;
      return regExp;
    }
    minimatch.makeRe = function(pattern, options) {
      return new Minimatch(pattern, options || {}).makeRe();
    };
    Minimatch.prototype.makeRe = makeRe;
    function makeRe() {
      if (this.regexp || this.regexp === false)
        return this.regexp;
      var set = this.set;
      if (!set.length) {
        this.regexp = false;
        return this.regexp;
      }
      var options = this.options;
      var twoStar = options.noglobstar ? star : options.dot ? twoStarDot : twoStarNoDot;
      var flags = options.nocase ? "i" : "";
      var re = set.map(function(pattern) {
        return pattern.map(function(p) {
          return p === GLOBSTAR ? twoStar : typeof p === "string" ? regExpEscape(p) : p._src;
        }).join("\\/");
      }).join("|");
      re = "^(?:" + re + ")$";
      if (this.negate)
        re = "^(?!" + re + ").*$";
      try {
        this.regexp = new RegExp(re, flags);
      } catch (ex) {
        this.regexp = false;
      }
      return this.regexp;
    }
    minimatch.match = function(list, pattern, options) {
      options = options || {};
      var mm = new Minimatch(pattern, options);
      list = list.filter(function(f) {
        return mm.match(f);
      });
      if (mm.options.nonull && !list.length) {
        list.push(pattern);
      }
      return list;
    };
    Minimatch.prototype.match = function match(f, partial) {
      if (typeof partial === "undefined")
        partial = this.partial;
      this.debug("match", f, this.pattern);
      if (this.comment)
        return false;
      if (this.empty)
        return f === "";
      if (f === "/" && partial)
        return true;
      var options = this.options;
      if (path.sep !== "/") {
        f = f.split(path.sep).join("/");
      }
      f = f.split(slashSplit);
      this.debug(this.pattern, "split", f);
      var set = this.set;
      this.debug(this.pattern, "set", set);
      var filename;
      var i;
      for (i = f.length - 1; i >= 0; i--) {
        filename = f[i];
        if (filename)
          break;
      }
      for (i = 0; i < set.length; i++) {
        var pattern = set[i];
        var file = f;
        if (options.matchBase && pattern.length === 1) {
          file = [filename];
        }
        var hit = this.matchOne(file, pattern, partial);
        if (hit) {
          if (options.flipNegate)
            return true;
          return !this.negate;
        }
      }
      if (options.flipNegate)
        return false;
      return this.negate;
    };
    Minimatch.prototype.matchOne = function(file, pattern, partial) {
      var options = this.options;
      this.debug(
        "matchOne",
        { "this": this, file, pattern }
      );
      this.debug("matchOne", file.length, pattern.length);
      for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
        this.debug("matchOne loop");
        var p = pattern[pi];
        var f = file[fi];
        this.debug(pattern, p, f);
        if (p === false)
          return false;
        if (p === GLOBSTAR) {
          this.debug("GLOBSTAR", [pattern, p, f]);
          var fr = fi;
          var pr = pi + 1;
          if (pr === pl) {
            this.debug("** at the end");
            for (; fi < fl; fi++) {
              if (file[fi] === "." || file[fi] === ".." || !options.dot && file[fi].charAt(0) === ".")
                return false;
            }
            return true;
          }
          while (fr < fl) {
            var swallowee = file[fr];
            this.debug("\nglobstar while", file, fr, pattern, pr, swallowee);
            if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
              this.debug("globstar found match!", fr, fl, swallowee);
              return true;
            } else {
              if (swallowee === "." || swallowee === ".." || !options.dot && swallowee.charAt(0) === ".") {
                this.debug("dot detected!", file, fr, pattern, pr);
                break;
              }
              this.debug("globstar swallow a segment, and continue");
              fr++;
            }
          }
          if (partial) {
            this.debug("\n>>> no match, partial?", file, fr, pattern, pr);
            if (fr === fl)
              return true;
          }
          return false;
        }
        var hit;
        if (typeof p === "string") {
          hit = f === p;
          this.debug("string match", p, f, hit);
        } else {
          hit = f.match(p);
          this.debug("pattern match", p, f, hit);
        }
        if (!hit)
          return false;
      }
      if (fi === fl && pi === pl) {
        return true;
      } else if (fi === fl) {
        return partial;
      } else if (pi === pl) {
        return fi === fl - 1 && file[fi] === "";
      }
      throw new Error("wtf?");
    };
    function globUnescape(s) {
      return s.replace(/\\(.)/g, "$1");
    }
    function regExpEscape(s) {
      return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }
  }
});

// node_modules/dir-compare/build/src/FilterHandler/defaultFilterHandler.js
var require_defaultFilterHandler = __commonJS({
  "node_modules/dir-compare/build/src/FilterHandler/defaultFilterHandler.js"(exports2) {
    "use strict";
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.defaultFilterHandler = void 0;
    var path_1 = __importDefault(require("path"));
    var minimatch_1 = __importDefault(require_minimatch());
    var defaultFilterHandler = (entry, relativePath, options) => {
      const path = path_1.default.join(relativePath, entry.name);
      if (entry.stat.isFile() && options.includeFilter && !match(path, options.includeFilter)) {
        return false;
      }
      if (options.excludeFilter && match(path, options.excludeFilter)) {
        return false;
      }
      return true;
    };
    exports2.defaultFilterHandler = defaultFilterHandler;
    function match(path, pattern) {
      const patternArray = pattern.split(",");
      for (let i = 0; i < patternArray.length; i++) {
        const pat = patternArray[i];
        if ((0, minimatch_1.default)(path, pat, { dot: true, matchBase: true })) {
          return true;
        }
      }
      return false;
    }
  }
});

// node_modules/dir-compare/build/src/types.js
var require_types = __commonJS({
  "node_modules/dir-compare/build/src/types.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/dir-compare/build/src/index.js
var require_src = __commonJS({
  "node_modules/dir-compare/build/src/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p))
          __createBinding(exports3, m, p);
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.filterHandlers = exports2.compareNameHandlers = exports2.fileCompareHandlers = exports2.compare = exports2.compareSync = void 0;
    var path_1 = __importDefault(require("path"));
    var fs_1 = __importDefault(require("fs"));
    var compareSync_1 = require_compareSync();
    var compareAsync_1 = require_compareAsync();
    var defaultFileCompare_1 = require_defaultFileCompare();
    var lineBasedFileCompare_1 = require_lineBasedFileCompare();
    var defaultNameCompare_1 = require_defaultNameCompare();
    var EntryBuilder_1 = require_EntryBuilder();
    var StatisticsLifecycle_1 = require_StatisticsLifecycle();
    var LoopDetector_1 = require_LoopDetector();
    var defaultResultBuilderCallback_1 = require_defaultResultBuilderCallback();
    var fileBasedNameCompare_1 = require_fileBasedNameCompare();
    var defaultFilterHandler_1 = require_defaultFilterHandler();
    var ROOT_PATH = path_1.default.sep;
    __exportStar(require_types(), exports2);
    function compareSync(path1, path2, options) {
      const absolutePath1 = path_1.default.normalize(path_1.default.resolve(fs_1.default.realpathSync(path1)));
      const absolutePath2 = path_1.default.normalize(path_1.default.resolve(fs_1.default.realpathSync(path2)));
      const compareInfo = getCompareInfo(absolutePath1, absolutePath2);
      const extOptions = prepareOptions(compareInfo, options);
      let diffSet;
      if (!extOptions.noDiffSet) {
        diffSet = [];
      }
      const initialStatistics = StatisticsLifecycle_1.StatisticsLifecycle.initStats(extOptions);
      if (compareInfo.mode === "mixed") {
        compareMixedEntries(absolutePath1, absolutePath2, diffSet, initialStatistics, compareInfo);
      } else {
        (0, compareSync_1.compareSync)(EntryBuilder_1.EntryBuilder.buildEntry(absolutePath1, path1, path_1.default.basename(absolutePath1), "left", extOptions), EntryBuilder_1.EntryBuilder.buildEntry(absolutePath2, path2, path_1.default.basename(absolutePath2), "right", extOptions), 0, ROOT_PATH, extOptions, initialStatistics, diffSet, LoopDetector_1.LoopDetector.initSymlinkCache());
      }
      const result = StatisticsLifecycle_1.StatisticsLifecycle.completeStatistics(initialStatistics, extOptions);
      result.diffSet = diffSet;
      return result;
    }
    exports2.compareSync = compareSync;
    function compare(path1, path2, options) {
      let absolutePath1, absolutePath2;
      return Promise.resolve().then(() => Promise.all([wrapper.realPath(path1), wrapper.realPath(path2)])).then((realPaths) => {
        const realPath1 = realPaths[0];
        const realPath2 = realPaths[1];
        absolutePath1 = path_1.default.normalize(path_1.default.resolve(realPath1));
        absolutePath2 = path_1.default.normalize(path_1.default.resolve(realPath2));
      }).then(() => {
        const compareInfo = getCompareInfo(absolutePath1, absolutePath2);
        const extOptions = prepareOptions(compareInfo, options);
        const asyncDiffSet = [];
        const initialStatistics = StatisticsLifecycle_1.StatisticsLifecycle.initStats(extOptions);
        if (compareInfo.mode === "mixed") {
          let diffSet;
          if (!extOptions.noDiffSet) {
            diffSet = [];
          }
          compareMixedEntries(absolutePath1, absolutePath2, diffSet, initialStatistics, compareInfo);
          const result = StatisticsLifecycle_1.StatisticsLifecycle.completeStatistics(initialStatistics, extOptions);
          result.diffSet = diffSet;
          return result;
        }
        return (0, compareAsync_1.compareAsync)(EntryBuilder_1.EntryBuilder.buildEntry(absolutePath1, path1, path_1.default.basename(absolutePath1), "left", extOptions), EntryBuilder_1.EntryBuilder.buildEntry(absolutePath2, path2, path_1.default.basename(absolutePath2), "right", extOptions), 0, ROOT_PATH, extOptions, initialStatistics, asyncDiffSet, LoopDetector_1.LoopDetector.initSymlinkCache()).then(() => {
          const result = StatisticsLifecycle_1.StatisticsLifecycle.completeStatistics(initialStatistics, extOptions);
          if (!extOptions.noDiffSet) {
            const diffSet = [];
            rebuildAsyncDiffSet(result, asyncDiffSet, diffSet);
            result.diffSet = diffSet;
          }
          return result;
        });
      });
    }
    exports2.compare = compare;
    exports2.fileCompareHandlers = {
      defaultFileCompare: defaultFileCompare_1.defaultFileCompare,
      lineBasedFileCompare: lineBasedFileCompare_1.lineBasedFileCompare
    };
    exports2.compareNameHandlers = {
      defaultNameCompare: defaultNameCompare_1.defaultNameCompare
    };
    exports2.filterHandlers = {
      defaultFilterHandler: defaultFilterHandler_1.defaultFilterHandler
    };
    var wrapper = {
      realPath(path, options) {
        return new Promise((resolve, reject) => {
          fs_1.default.realpath(path, options, (err, resolvedPath) => {
            if (err) {
              reject(err);
            } else {
              resolve(resolvedPath);
            }
          });
        });
      }
    };
    function prepareOptions(compareInfo, options) {
      options = options || {};
      const clone = JSON.parse(JSON.stringify(options));
      clone.resultBuilder = options.resultBuilder;
      clone.compareFileSync = options.compareFileSync;
      clone.compareFileAsync = options.compareFileAsync;
      clone.compareNameHandler = options.compareNameHandler;
      clone.filterHandler = options.filterHandler;
      if (!clone.resultBuilder) {
        clone.resultBuilder = defaultResultBuilderCallback_1.defaultResultBuilderCallback;
      }
      if (!clone.compareFileSync) {
        clone.compareFileSync = defaultFileCompare_1.defaultFileCompare.compareSync;
      }
      if (!clone.compareFileAsync) {
        clone.compareFileAsync = defaultFileCompare_1.defaultFileCompare.compareAsync;
      }
      if (!clone.compareNameHandler) {
        const isFileBasedCompare = compareInfo.mode === "files";
        clone.compareNameHandler = isFileBasedCompare ? fileBasedNameCompare_1.fileBasedNameCompare : defaultNameCompare_1.defaultNameCompare;
      }
      if (!clone.filterHandler) {
        clone.filterHandler = defaultFilterHandler_1.defaultFilterHandler;
      }
      clone.dateTolerance = clone.dateTolerance || 1e3;
      clone.dateTolerance = Number(clone.dateTolerance);
      if (isNaN(clone.dateTolerance)) {
        throw new Error("Date tolerance is not a number");
      }
      return clone;
    }
    function rebuildAsyncDiffSet(statistics, asyncDiffSet, diffSet) {
      asyncDiffSet.forEach((rawDiff) => {
        if (!Array.isArray(rawDiff)) {
          diffSet.push(rawDiff);
        } else {
          rebuildAsyncDiffSet(statistics, rawDiff, diffSet);
        }
      });
    }
    function getCompareInfo(path1, path2) {
      const stat1 = fs_1.default.lstatSync(path1);
      const stat2 = fs_1.default.lstatSync(path2);
      if (stat1.isDirectory() && stat2.isDirectory()) {
        return {
          mode: "directories",
          type1: "directory",
          type2: "directory",
          size1: stat1.size,
          size2: stat2.size,
          date1: stat1.mtime,
          date2: stat2.mtime
        };
      }
      if (stat1.isFile() && stat2.isFile()) {
        return {
          mode: "files",
          type1: "file",
          type2: "file",
          size1: stat1.size,
          size2: stat2.size,
          date1: stat1.mtime,
          date2: stat2.mtime
        };
      }
      return {
        mode: "mixed",
        type1: stat1.isFile() ? "file" : "directory",
        type2: stat2.isFile() ? "file" : "directory",
        size1: stat1.size,
        size2: stat2.size,
        date1: stat1.mtime,
        date2: stat2.mtime
      };
    }
    function compareMixedEntries(path1, path2, diffSet, initialStatistics, compareInfo) {
      initialStatistics.distinct = 2;
      initialStatistics.distinctDirs = 1;
      initialStatistics.distinctFiles = 1;
      if (diffSet) {
        diffSet.push({
          path1,
          path2,
          relativePath: "",
          name1: path_1.default.basename(path1),
          name2: path_1.default.basename(path2),
          state: "distinct",
          permissionDeniedState: "access-ok",
          type1: compareInfo.type1,
          type2: compareInfo.type2,
          level: 0,
          size1: compareInfo.size1,
          size2: compareInfo.size2,
          date1: compareInfo.date1,
          date2: compareInfo.date2,
          reason: "different-content"
        });
      }
    }
  }
});

// out/services/openFolder.js
var require_openFolder = __commonJS({
  "out/services/openFolder.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.openFolder = void 0;
    var vscode_12 = require("vscode");
    function openFolder() {
      const options = {
        canSelectMany: false,
        openLabel: "Open",
        canSelectFolders: true
      };
      return new Promise((resolve) => {
        vscode_12.window.showOpenDialog(options).then((fileUri) => {
          if (fileUri && fileUri[0]) {
            resolve(fileUri[0].fsPath);
          } else {
            resolve(void 0);
          }
        });
      });
    }
    exports2.openFolder = openFolder;
  }
});

// out/services/configuration.js
var require_configuration = __commonJS({
  "out/services/configuration.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getConfiguration = void 0;
    var vscode_12 = require("vscode");
    function get() {
      return vscode_12.workspace.getConfiguration("compareFolders");
    }
    function getConfigItem(key) {
      const config = get();
      return config.get(key);
    }
    function getConfiguration(...args) {
      const config = get();
      if (args.length === 1) {
        return getConfigItem(args[0]);
      }
      const result = {};
      args.forEach((arg) => {
        result[arg] = config.get(arg);
      });
      return result;
    }
    exports2.getConfiguration = getConfiguration;
  }
});

// out/services/logger.js
var require_logger = __commonJS({
  "out/services/logger.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.printResult = exports2.printOptions = exports2.log = exports2.error = void 0;
    var vscode_12 = require("vscode");
    var logger = vscode_12.window.createOutputChannel("Compare Folders");
    function printData(...data) {
      data.forEach((item) => {
        if (typeof item === "string") {
          logger.appendLine(item);
        } else {
          logger.appendLine(JSON.stringify(item, null, 2));
        }
      });
    }
    function error(...data) {
      logger.appendLine("====error====");
      printData(...data);
      console.error(...data);
      logger.appendLine("===============");
    }
    exports2.error = error;
    function log(...data) {
      printData(...data);
      console.log(...data);
    }
    exports2.log = log;
    function printOptions(options) {
      log("====options====");
      log(options);
      log("===============");
    }
    exports2.printOptions = printOptions;
    function printResult(result) {
      log("====result====");
      log("Directories are %s", result.same ? "identical" : "different");
      log("Statistics - equal entries: %s, distinct entries: %s, left only entries: %s, right only entries: %s, differences: %s", result.equal, result.distinct, result.left, result.right, result.differences);
      if (!result.diffSet) {
        log("result is undefined");
        return;
      }
      result.diffSet.forEach((dif) => log(`${dif.name1} ${dif.name2} ${dif.state} ${dif.type1} ${dif.type2}`));
      log("===============");
    }
    exports2.printResult = printResult;
  }
});

// out/services/globalState.js
var require_globalState = __commonJS({
  "out/services/globalState.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.SEPERATOR = exports2.globalState = void 0;
    var logger_1 = require_logger();
    var GlobalState = class {
      constructor() {
        this.KEY = "compareFolders.paths";
        this.VERSION_KEY = "compareFolders.version";
        this.clear = () => {
          var _a;
          (_a = this.globalState) === null || _a === void 0 ? void 0 : _a.update(this.KEY, []);
        };
      }
      init(context) {
        this.globalState = context.globalState;
        this.globalState.update(this.VERSION_KEY, context.extension.packageJSON.version);
      }
      get extensionVersion() {
        var _a;
        return (_a = this.globalState) === null || _a === void 0 ? void 0 : _a.get(this.VERSION_KEY);
      }
      updatePaths(path1, path2) {
        try {
          if (!this.globalState) {
            throw new Error(`globalState hasn't been initilized`);
          }
          const newPath = `${path1}${exports2.SEPERATOR}${path2}`;
          const currentPaths = this.getPaths();
          const newPaths = [newPath, ...currentPaths.filter((path) => path !== newPath)];
          this.globalState.update(this.KEY, newPaths);
        } catch (error) {
          (0, logger_1.log)(error);
        }
      }
      getPaths() {
        if (!this.globalState) {
          throw new Error(`globalState hasn't been initilized`);
        }
        return this.globalState.get(this.KEY, []);
      }
    };
    exports2.globalState = new GlobalState();
    exports2.SEPERATOR = "\u2194";
  }
});

// out/context/path.js
var require_path = __commonJS({
  "out/context/path.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.pathContext = void 0;
    var vscode_12 = require("vscode");
    var globalState_12 = require_globalState();
    var PathContext = class {
      get mainPath() {
        var _a;
        if (!this._mainPath) {
          return (_a = vscode_12.workspace.rootPath) !== null && _a !== void 0 ? _a : "";
        }
        return this._mainPath;
      }
      set mainPath(path) {
        this._mainPath = path;
      }
      get comparedPath() {
        if (!this._comparedPath) {
          throw new Error("compared path is not set");
        }
        return this._comparedPath;
      }
      set comparedPath(path) {
        this._comparedPath = path;
      }
      setPaths(path1, path2) {
        this.mainPath = path1;
        this.comparedPath = path2;
        globalState_12.globalState.updatePaths(path1, path2);
      }
      getPaths() {
        return [this.mainPath, this.comparedPath];
      }
      swap() {
        const cachedMainPath = this._mainPath;
        this._mainPath = this._comparedPath;
        this._comparedPath = cachedMainPath;
      }
    };
    exports2.pathContext = new PathContext();
  }
});

// node_modules/lodash/lodash.js
var require_lodash = __commonJS({
  "node_modules/lodash/lodash.js"(exports2, module2) {
    (function() {
      var undefined2;
      var VERSION = "4.17.21";
      var LARGE_ARRAY_SIZE = 200;
      var CORE_ERROR_TEXT = "Unsupported core-js use. Try https://npms.io/search?q=ponyfill.", FUNC_ERROR_TEXT = "Expected a function", INVALID_TEMPL_VAR_ERROR_TEXT = "Invalid `variable` option passed into `_.template`";
      var HASH_UNDEFINED = "__lodash_hash_undefined__";
      var MAX_MEMOIZE_SIZE = 500;
      var PLACEHOLDER = "__lodash_placeholder__";
      var CLONE_DEEP_FLAG = 1, CLONE_FLAT_FLAG = 2, CLONE_SYMBOLS_FLAG = 4;
      var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
      var WRAP_BIND_FLAG = 1, WRAP_BIND_KEY_FLAG = 2, WRAP_CURRY_BOUND_FLAG = 4, WRAP_CURRY_FLAG = 8, WRAP_CURRY_RIGHT_FLAG = 16, WRAP_PARTIAL_FLAG = 32, WRAP_PARTIAL_RIGHT_FLAG = 64, WRAP_ARY_FLAG = 128, WRAP_REARG_FLAG = 256, WRAP_FLIP_FLAG = 512;
      var DEFAULT_TRUNC_LENGTH = 30, DEFAULT_TRUNC_OMISSION = "...";
      var HOT_COUNT = 800, HOT_SPAN = 16;
      var LAZY_FILTER_FLAG = 1, LAZY_MAP_FLAG = 2, LAZY_WHILE_FLAG = 3;
      var INFINITY = 1 / 0, MAX_SAFE_INTEGER = 9007199254740991, MAX_INTEGER = 17976931348623157e292, NAN = 0 / 0;
      var MAX_ARRAY_LENGTH = 4294967295, MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1, HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
      var wrapFlags = [
        ["ary", WRAP_ARY_FLAG],
        ["bind", WRAP_BIND_FLAG],
        ["bindKey", WRAP_BIND_KEY_FLAG],
        ["curry", WRAP_CURRY_FLAG],
        ["curryRight", WRAP_CURRY_RIGHT_FLAG],
        ["flip", WRAP_FLIP_FLAG],
        ["partial", WRAP_PARTIAL_FLAG],
        ["partialRight", WRAP_PARTIAL_RIGHT_FLAG],
        ["rearg", WRAP_REARG_FLAG]
      ];
      var argsTag = "[object Arguments]", arrayTag = "[object Array]", asyncTag = "[object AsyncFunction]", boolTag = "[object Boolean]", dateTag = "[object Date]", domExcTag = "[object DOMException]", errorTag = "[object Error]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", mapTag = "[object Map]", numberTag = "[object Number]", nullTag = "[object Null]", objectTag = "[object Object]", promiseTag = "[object Promise]", proxyTag = "[object Proxy]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", symbolTag = "[object Symbol]", undefinedTag = "[object Undefined]", weakMapTag = "[object WeakMap]", weakSetTag = "[object WeakSet]";
      var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
      var reEmptyStringLeading = /\b__p \+= '';/g, reEmptyStringMiddle = /\b(__p \+=) '' \+/g, reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
      var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g, reUnescapedHtml = /[&<>"']/g, reHasEscapedHtml = RegExp(reEscapedHtml.source), reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
      var reEscape = /<%-([\s\S]+?)%>/g, reEvaluate = /<%([\s\S]+?)%>/g, reInterpolate = /<%=([\s\S]+?)%>/g;
      var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/, rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
      var reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reHasRegExpChar = RegExp(reRegExpChar.source);
      var reTrimStart = /^\s+/;
      var reWhitespace = /\s/;
      var reWrapComment = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/, reWrapDetails = /\{\n\/\* \[wrapped with (.+)\] \*/, reSplitDetails = /,? & /;
      var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
      var reForbiddenIdentifierChars = /[()=,{}\[\]\/\s]/;
      var reEscapeChar = /\\(\\)?/g;
      var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
      var reFlags = /\w*$/;
      var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
      var reIsBinary = /^0b[01]+$/i;
      var reIsHostCtor = /^\[object .+?Constructor\]$/;
      var reIsOctal = /^0o[0-7]+$/i;
      var reIsUint = /^(?:0|[1-9]\d*)$/;
      var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
      var reNoMatch = /($^)/;
      var reUnescapedString = /['\n\r\u2028\u2029\\]/g;
      var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange, rsDingbatRange = "\\u2700-\\u27bf", rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff", rsMathOpRange = "\\xac\\xb1\\xd7\\xf7", rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", rsPunctuationRange = "\\u2000-\\u206f", rsSpaceRange = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde", rsVarRange = "\\ufe0e\\ufe0f", rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;
      var rsApos = "['\u2019]", rsAstral = "[" + rsAstralRange + "]", rsBreak = "[" + rsBreakRange + "]", rsCombo = "[" + rsComboRange + "]", rsDigits = "\\d+", rsDingbat = "[" + rsDingbatRange + "]", rsLower = "[" + rsLowerRange + "]", rsMisc = "[^" + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]", rsFitz = "\\ud83c[\\udffb-\\udfff]", rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")", rsNonAstral = "[^" + rsAstralRange + "]", rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsUpper = "[" + rsUpperRange + "]", rsZWJ = "\\u200d";
      var rsMiscLower = "(?:" + rsLower + "|" + rsMisc + ")", rsMiscUpper = "(?:" + rsUpper + "|" + rsMisc + ")", rsOptContrLower = "(?:" + rsApos + "(?:d|ll|m|re|s|t|ve))?", rsOptContrUpper = "(?:" + rsApos + "(?:D|LL|M|RE|S|T|VE))?", reOptMod = rsModifier + "?", rsOptVar = "[" + rsVarRange + "]?", rsOptJoin = "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*", rsOrdLower = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", rsOrdUpper = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", rsSeq = rsOptVar + reOptMod + rsOptJoin, rsEmoji = "(?:" + [rsDingbat, rsRegional, rsSurrPair].join("|") + ")" + rsSeq, rsSymbol = "(?:" + [rsNonAstral + rsCombo + "?", rsCombo, rsRegional, rsSurrPair, rsAstral].join("|") + ")";
      var reApos = RegExp(rsApos, "g");
      var reComboMark = RegExp(rsCombo, "g");
      var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
      var reUnicodeWord = RegExp([
        rsUpper + "?" + rsLower + "+" + rsOptContrLower + "(?=" + [rsBreak, rsUpper, "$"].join("|") + ")",
        rsMiscUpper + "+" + rsOptContrUpper + "(?=" + [rsBreak, rsUpper + rsMiscLower, "$"].join("|") + ")",
        rsUpper + "?" + rsMiscLower + "+" + rsOptContrLower,
        rsUpper + "+" + rsOptContrUpper,
        rsOrdUpper,
        rsOrdLower,
        rsDigits,
        rsEmoji
      ].join("|"), "g");
      var reHasUnicode = RegExp("[" + rsZWJ + rsAstralRange + rsComboRange + rsVarRange + "]");
      var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
      var contextProps = [
        "Array",
        "Buffer",
        "DataView",
        "Date",
        "Error",
        "Float32Array",
        "Float64Array",
        "Function",
        "Int8Array",
        "Int16Array",
        "Int32Array",
        "Map",
        "Math",
        "Object",
        "Promise",
        "RegExp",
        "Set",
        "String",
        "Symbol",
        "TypeError",
        "Uint8Array",
        "Uint8ClampedArray",
        "Uint16Array",
        "Uint32Array",
        "WeakMap",
        "_",
        "clearTimeout",
        "isFinite",
        "parseInt",
        "setTimeout"
      ];
      var templateCounter = -1;
      var typedArrayTags = {};
      typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
      typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
      var cloneableTags = {};
      cloneableTags[argsTag] = cloneableTags[arrayTag] = cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] = cloneableTags[boolTag] = cloneableTags[dateTag] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[mapTag] = cloneableTags[numberTag] = cloneableTags[objectTag] = cloneableTags[regexpTag] = cloneableTags[setTag] = cloneableTags[stringTag] = cloneableTags[symbolTag] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
      cloneableTags[errorTag] = cloneableTags[funcTag] = cloneableTags[weakMapTag] = false;
      var deburredLetters = {
        // Latin-1 Supplement block.
        "\xC0": "A",
        "\xC1": "A",
        "\xC2": "A",
        "\xC3": "A",
        "\xC4": "A",
        "\xC5": "A",
        "\xE0": "a",
        "\xE1": "a",
        "\xE2": "a",
        "\xE3": "a",
        "\xE4": "a",
        "\xE5": "a",
        "\xC7": "C",
        "\xE7": "c",
        "\xD0": "D",
        "\xF0": "d",
        "\xC8": "E",
        "\xC9": "E",
        "\xCA": "E",
        "\xCB": "E",
        "\xE8": "e",
        "\xE9": "e",
        "\xEA": "e",
        "\xEB": "e",
        "\xCC": "I",
        "\xCD": "I",
        "\xCE": "I",
        "\xCF": "I",
        "\xEC": "i",
        "\xED": "i",
        "\xEE": "i",
        "\xEF": "i",
        "\xD1": "N",
        "\xF1": "n",
        "\xD2": "O",
        "\xD3": "O",
        "\xD4": "O",
        "\xD5": "O",
        "\xD6": "O",
        "\xD8": "O",
        "\xF2": "o",
        "\xF3": "o",
        "\xF4": "o",
        "\xF5": "o",
        "\xF6": "o",
        "\xF8": "o",
        "\xD9": "U",
        "\xDA": "U",
        "\xDB": "U",
        "\xDC": "U",
        "\xF9": "u",
        "\xFA": "u",
        "\xFB": "u",
        "\xFC": "u",
        "\xDD": "Y",
        "\xFD": "y",
        "\xFF": "y",
        "\xC6": "Ae",
        "\xE6": "ae",
        "\xDE": "Th",
        "\xFE": "th",
        "\xDF": "ss",
        // Latin Extended-A block.
        "\u0100": "A",
        "\u0102": "A",
        "\u0104": "A",
        "\u0101": "a",
        "\u0103": "a",
        "\u0105": "a",
        "\u0106": "C",
        "\u0108": "C",
        "\u010A": "C",
        "\u010C": "C",
        "\u0107": "c",
        "\u0109": "c",
        "\u010B": "c",
        "\u010D": "c",
        "\u010E": "D",
        "\u0110": "D",
        "\u010F": "d",
        "\u0111": "d",
        "\u0112": "E",
        "\u0114": "E",
        "\u0116": "E",
        "\u0118": "E",
        "\u011A": "E",
        "\u0113": "e",
        "\u0115": "e",
        "\u0117": "e",
        "\u0119": "e",
        "\u011B": "e",
        "\u011C": "G",
        "\u011E": "G",
        "\u0120": "G",
        "\u0122": "G",
        "\u011D": "g",
        "\u011F": "g",
        "\u0121": "g",
        "\u0123": "g",
        "\u0124": "H",
        "\u0126": "H",
        "\u0125": "h",
        "\u0127": "h",
        "\u0128": "I",
        "\u012A": "I",
        "\u012C": "I",
        "\u012E": "I",
        "\u0130": "I",
        "\u0129": "i",
        "\u012B": "i",
        "\u012D": "i",
        "\u012F": "i",
        "\u0131": "i",
        "\u0134": "J",
        "\u0135": "j",
        "\u0136": "K",
        "\u0137": "k",
        "\u0138": "k",
        "\u0139": "L",
        "\u013B": "L",
        "\u013D": "L",
        "\u013F": "L",
        "\u0141": "L",
        "\u013A": "l",
        "\u013C": "l",
        "\u013E": "l",
        "\u0140": "l",
        "\u0142": "l",
        "\u0143": "N",
        "\u0145": "N",
        "\u0147": "N",
        "\u014A": "N",
        "\u0144": "n",
        "\u0146": "n",
        "\u0148": "n",
        "\u014B": "n",
        "\u014C": "O",
        "\u014E": "O",
        "\u0150": "O",
        "\u014D": "o",
        "\u014F": "o",
        "\u0151": "o",
        "\u0154": "R",
        "\u0156": "R",
        "\u0158": "R",
        "\u0155": "r",
        "\u0157": "r",
        "\u0159": "r",
        "\u015A": "S",
        "\u015C": "S",
        "\u015E": "S",
        "\u0160": "S",
        "\u015B": "s",
        "\u015D": "s",
        "\u015F": "s",
        "\u0161": "s",
        "\u0162": "T",
        "\u0164": "T",
        "\u0166": "T",
        "\u0163": "t",
        "\u0165": "t",
        "\u0167": "t",
        "\u0168": "U",
        "\u016A": "U",
        "\u016C": "U",
        "\u016E": "U",
        "\u0170": "U",
        "\u0172": "U",
        "\u0169": "u",
        "\u016B": "u",
        "\u016D": "u",
        "\u016F": "u",
        "\u0171": "u",
        "\u0173": "u",
        "\u0174": "W",
        "\u0175": "w",
        "\u0176": "Y",
        "\u0177": "y",
        "\u0178": "Y",
        "\u0179": "Z",
        "\u017B": "Z",
        "\u017D": "Z",
        "\u017A": "z",
        "\u017C": "z",
        "\u017E": "z",
        "\u0132": "IJ",
        "\u0133": "ij",
        "\u0152": "Oe",
        "\u0153": "oe",
        "\u0149": "'n",
        "\u017F": "s"
      };
      var htmlEscapes = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      var htmlUnescapes = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'"
      };
      var stringEscapes = {
        "\\": "\\",
        "'": "'",
        "\n": "n",
        "\r": "r",
        "\u2028": "u2028",
        "\u2029": "u2029"
      };
      var freeParseFloat = parseFloat, freeParseInt = parseInt;
      var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
      var freeSelf = typeof self == "object" && self && self.Object === Object && self;
      var root = freeGlobal || freeSelf || Function("return this")();
      var freeExports = typeof exports2 == "object" && exports2 && !exports2.nodeType && exports2;
      var freeModule = freeExports && typeof module2 == "object" && module2 && !module2.nodeType && module2;
      var moduleExports = freeModule && freeModule.exports === freeExports;
      var freeProcess = moduleExports && freeGlobal.process;
      var nodeUtil = function() {
        try {
          var types = freeModule && freeModule.require && freeModule.require("util").types;
          if (types) {
            return types;
          }
          return freeProcess && freeProcess.binding && freeProcess.binding("util");
        } catch (e) {
        }
      }();
      var nodeIsArrayBuffer = nodeUtil && nodeUtil.isArrayBuffer, nodeIsDate = nodeUtil && nodeUtil.isDate, nodeIsMap = nodeUtil && nodeUtil.isMap, nodeIsRegExp = nodeUtil && nodeUtil.isRegExp, nodeIsSet = nodeUtil && nodeUtil.isSet, nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
      function apply(func, thisArg, args) {
        switch (args.length) {
          case 0:
            return func.call(thisArg);
          case 1:
            return func.call(thisArg, args[0]);
          case 2:
            return func.call(thisArg, args[0], args[1]);
          case 3:
            return func.call(thisArg, args[0], args[1], args[2]);
        }
        return func.apply(thisArg, args);
      }
      function arrayAggregator(array, setter, iteratee, accumulator) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          var value = array[index];
          setter(accumulator, value, iteratee(value), array);
        }
        return accumulator;
      }
      function arrayEach(array, iteratee) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (iteratee(array[index], index, array) === false) {
            break;
          }
        }
        return array;
      }
      function arrayEachRight(array, iteratee) {
        var length = array == null ? 0 : array.length;
        while (length--) {
          if (iteratee(array[length], length, array) === false) {
            break;
          }
        }
        return array;
      }
      function arrayEvery(array, predicate) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (!predicate(array[index], index, array)) {
            return false;
          }
        }
        return true;
      }
      function arrayFilter(array, predicate) {
        var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result = [];
        while (++index < length) {
          var value = array[index];
          if (predicate(value, index, array)) {
            result[resIndex++] = value;
          }
        }
        return result;
      }
      function arrayIncludes(array, value) {
        var length = array == null ? 0 : array.length;
        return !!length && baseIndexOf(array, value, 0) > -1;
      }
      function arrayIncludesWith(array, value, comparator) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (comparator(value, array[index])) {
            return true;
          }
        }
        return false;
      }
      function arrayMap(array, iteratee) {
        var index = -1, length = array == null ? 0 : array.length, result = Array(length);
        while (++index < length) {
          result[index] = iteratee(array[index], index, array);
        }
        return result;
      }
      function arrayPush(array, values) {
        var index = -1, length = values.length, offset = array.length;
        while (++index < length) {
          array[offset + index] = values[index];
        }
        return array;
      }
      function arrayReduce(array, iteratee, accumulator, initAccum) {
        var index = -1, length = array == null ? 0 : array.length;
        if (initAccum && length) {
          accumulator = array[++index];
        }
        while (++index < length) {
          accumulator = iteratee(accumulator, array[index], index, array);
        }
        return accumulator;
      }
      function arrayReduceRight(array, iteratee, accumulator, initAccum) {
        var length = array == null ? 0 : array.length;
        if (initAccum && length) {
          accumulator = array[--length];
        }
        while (length--) {
          accumulator = iteratee(accumulator, array[length], length, array);
        }
        return accumulator;
      }
      function arraySome(array, predicate) {
        var index = -1, length = array == null ? 0 : array.length;
        while (++index < length) {
          if (predicate(array[index], index, array)) {
            return true;
          }
        }
        return false;
      }
      var asciiSize = baseProperty("length");
      function asciiToArray(string) {
        return string.split("");
      }
      function asciiWords(string) {
        return string.match(reAsciiWord) || [];
      }
      function baseFindKey(collection, predicate, eachFunc) {
        var result;
        eachFunc(collection, function(value, key, collection2) {
          if (predicate(value, key, collection2)) {
            result = key;
            return false;
          }
        });
        return result;
      }
      function baseFindIndex(array, predicate, fromIndex, fromRight) {
        var length = array.length, index = fromIndex + (fromRight ? 1 : -1);
        while (fromRight ? index-- : ++index < length) {
          if (predicate(array[index], index, array)) {
            return index;
          }
        }
        return -1;
      }
      function baseIndexOf(array, value, fromIndex) {
        return value === value ? strictIndexOf(array, value, fromIndex) : baseFindIndex(array, baseIsNaN, fromIndex);
      }
      function baseIndexOfWith(array, value, fromIndex, comparator) {
        var index = fromIndex - 1, length = array.length;
        while (++index < length) {
          if (comparator(array[index], value)) {
            return index;
          }
        }
        return -1;
      }
      function baseIsNaN(value) {
        return value !== value;
      }
      function baseMean(array, iteratee) {
        var length = array == null ? 0 : array.length;
        return length ? baseSum(array, iteratee) / length : NAN;
      }
      function baseProperty(key) {
        return function(object) {
          return object == null ? undefined2 : object[key];
        };
      }
      function basePropertyOf(object) {
        return function(key) {
          return object == null ? undefined2 : object[key];
        };
      }
      function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
        eachFunc(collection, function(value, index, collection2) {
          accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index, collection2);
        });
        return accumulator;
      }
      function baseSortBy(array, comparer) {
        var length = array.length;
        array.sort(comparer);
        while (length--) {
          array[length] = array[length].value;
        }
        return array;
      }
      function baseSum(array, iteratee) {
        var result, index = -1, length = array.length;
        while (++index < length) {
          var current = iteratee(array[index]);
          if (current !== undefined2) {
            result = result === undefined2 ? current : result + current;
          }
        }
        return result;
      }
      function baseTimes(n, iteratee) {
        var index = -1, result = Array(n);
        while (++index < n) {
          result[index] = iteratee(index);
        }
        return result;
      }
      function baseToPairs(object, props) {
        return arrayMap(props, function(key) {
          return [key, object[key]];
        });
      }
      function baseTrim(string) {
        return string ? string.slice(0, trimmedEndIndex(string) + 1).replace(reTrimStart, "") : string;
      }
      function baseUnary(func) {
        return function(value) {
          return func(value);
        };
      }
      function baseValues(object, props) {
        return arrayMap(props, function(key) {
          return object[key];
        });
      }
      function cacheHas(cache, key) {
        return cache.has(key);
      }
      function charsStartIndex(strSymbols, chrSymbols) {
        var index = -1, length = strSymbols.length;
        while (++index < length && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {
        }
        return index;
      }
      function charsEndIndex(strSymbols, chrSymbols) {
        var index = strSymbols.length;
        while (index-- && baseIndexOf(chrSymbols, strSymbols[index], 0) > -1) {
        }
        return index;
      }
      function countHolders(array, placeholder) {
        var length = array.length, result = 0;
        while (length--) {
          if (array[length] === placeholder) {
            ++result;
          }
        }
        return result;
      }
      var deburrLetter = basePropertyOf(deburredLetters);
      var escapeHtmlChar = basePropertyOf(htmlEscapes);
      function escapeStringChar(chr) {
        return "\\" + stringEscapes[chr];
      }
      function getValue(object, key) {
        return object == null ? undefined2 : object[key];
      }
      function hasUnicode(string) {
        return reHasUnicode.test(string);
      }
      function hasUnicodeWord(string) {
        return reHasUnicodeWord.test(string);
      }
      function iteratorToArray(iterator) {
        var data, result = [];
        while (!(data = iterator.next()).done) {
          result.push(data.value);
        }
        return result;
      }
      function mapToArray(map) {
        var index = -1, result = Array(map.size);
        map.forEach(function(value, key) {
          result[++index] = [key, value];
        });
        return result;
      }
      function overArg(func, transform) {
        return function(arg) {
          return func(transform(arg));
        };
      }
      function replaceHolders(array, placeholder) {
        var index = -1, length = array.length, resIndex = 0, result = [];
        while (++index < length) {
          var value = array[index];
          if (value === placeholder || value === PLACEHOLDER) {
            array[index] = PLACEHOLDER;
            result[resIndex++] = index;
          }
        }
        return result;
      }
      function setToArray(set) {
        var index = -1, result = Array(set.size);
        set.forEach(function(value) {
          result[++index] = value;
        });
        return result;
      }
      function setToPairs(set) {
        var index = -1, result = Array(set.size);
        set.forEach(function(value) {
          result[++index] = [value, value];
        });
        return result;
      }
      function strictIndexOf(array, value, fromIndex) {
        var index = fromIndex - 1, length = array.length;
        while (++index < length) {
          if (array[index] === value) {
            return index;
          }
        }
        return -1;
      }
      function strictLastIndexOf(array, value, fromIndex) {
        var index = fromIndex + 1;
        while (index--) {
          if (array[index] === value) {
            return index;
          }
        }
        return index;
      }
      function stringSize(string) {
        return hasUnicode(string) ? unicodeSize(string) : asciiSize(string);
      }
      function stringToArray(string) {
        return hasUnicode(string) ? unicodeToArray(string) : asciiToArray(string);
      }
      function trimmedEndIndex(string) {
        var index = string.length;
        while (index-- && reWhitespace.test(string.charAt(index))) {
        }
        return index;
      }
      var unescapeHtmlChar = basePropertyOf(htmlUnescapes);
      function unicodeSize(string) {
        var result = reUnicode.lastIndex = 0;
        while (reUnicode.test(string)) {
          ++result;
        }
        return result;
      }
      function unicodeToArray(string) {
        return string.match(reUnicode) || [];
      }
      function unicodeWords(string) {
        return string.match(reUnicodeWord) || [];
      }
      var runInContext = function runInContext2(context) {
        context = context == null ? root : _.defaults(root.Object(), context, _.pick(root, contextProps));
        var Array2 = context.Array, Date2 = context.Date, Error2 = context.Error, Function2 = context.Function, Math2 = context.Math, Object2 = context.Object, RegExp2 = context.RegExp, String2 = context.String, TypeError2 = context.TypeError;
        var arrayProto = Array2.prototype, funcProto = Function2.prototype, objectProto = Object2.prototype;
        var coreJsData = context["__core-js_shared__"];
        var funcToString = funcProto.toString;
        var hasOwnProperty = objectProto.hasOwnProperty;
        var idCounter = 0;
        var maskSrcKey = function() {
          var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
          return uid ? "Symbol(src)_1." + uid : "";
        }();
        var nativeObjectToString = objectProto.toString;
        var objectCtorString = funcToString.call(Object2);
        var oldDash = root._;
        var reIsNative = RegExp2(
          "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
        );
        var Buffer2 = moduleExports ? context.Buffer : undefined2, Symbol2 = context.Symbol, Uint8Array2 = context.Uint8Array, allocUnsafe = Buffer2 ? Buffer2.allocUnsafe : undefined2, getPrototype = overArg(Object2.getPrototypeOf, Object2), objectCreate = Object2.create, propertyIsEnumerable = objectProto.propertyIsEnumerable, splice = arrayProto.splice, spreadableSymbol = Symbol2 ? Symbol2.isConcatSpreadable : undefined2, symIterator = Symbol2 ? Symbol2.iterator : undefined2, symToStringTag = Symbol2 ? Symbol2.toStringTag : undefined2;
        var defineProperty = function() {
          try {
            var func = getNative(Object2, "defineProperty");
            func({}, "", {});
            return func;
          } catch (e) {
          }
        }();
        var ctxClearTimeout = context.clearTimeout !== root.clearTimeout && context.clearTimeout, ctxNow = Date2 && Date2.now !== root.Date.now && Date2.now, ctxSetTimeout = context.setTimeout !== root.setTimeout && context.setTimeout;
        var nativeCeil = Math2.ceil, nativeFloor = Math2.floor, nativeGetSymbols = Object2.getOwnPropertySymbols, nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : undefined2, nativeIsFinite = context.isFinite, nativeJoin = arrayProto.join, nativeKeys = overArg(Object2.keys, Object2), nativeMax = Math2.max, nativeMin = Math2.min, nativeNow = Date2.now, nativeParseInt = context.parseInt, nativeRandom = Math2.random, nativeReverse = arrayProto.reverse;
        var DataView = getNative(context, "DataView"), Map2 = getNative(context, "Map"), Promise2 = getNative(context, "Promise"), Set2 = getNative(context, "Set"), WeakMap = getNative(context, "WeakMap"), nativeCreate = getNative(Object2, "create");
        var metaMap = WeakMap && new WeakMap();
        var realNames = {};
        var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map2), promiseCtorString = toSource(Promise2), setCtorString = toSource(Set2), weakMapCtorString = toSource(WeakMap);
        var symbolProto = Symbol2 ? Symbol2.prototype : undefined2, symbolValueOf = symbolProto ? symbolProto.valueOf : undefined2, symbolToString = symbolProto ? symbolProto.toString : undefined2;
        function lodash(value) {
          if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
            if (value instanceof LodashWrapper) {
              return value;
            }
            if (hasOwnProperty.call(value, "__wrapped__")) {
              return wrapperClone(value);
            }
          }
          return new LodashWrapper(value);
        }
        var baseCreate = /* @__PURE__ */ function() {
          function object() {
          }
          return function(proto) {
            if (!isObject(proto)) {
              return {};
            }
            if (objectCreate) {
              return objectCreate(proto);
            }
            object.prototype = proto;
            var result2 = new object();
            object.prototype = undefined2;
            return result2;
          };
        }();
        function baseLodash() {
        }
        function LodashWrapper(value, chainAll) {
          this.__wrapped__ = value;
          this.__actions__ = [];
          this.__chain__ = !!chainAll;
          this.__index__ = 0;
          this.__values__ = undefined2;
        }
        lodash.templateSettings = {
          /**
           * Used to detect `data` property values to be HTML-escaped.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "escape": reEscape,
          /**
           * Used to detect code to be evaluated.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "evaluate": reEvaluate,
          /**
           * Used to detect `data` property values to inject.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "interpolate": reInterpolate,
          /**
           * Used to reference the data object in the template text.
           *
           * @memberOf _.templateSettings
           * @type {string}
           */
          "variable": "",
          /**
           * Used to import variables into the compiled template.
           *
           * @memberOf _.templateSettings
           * @type {Object}
           */
          "imports": {
            /**
             * A reference to the `lodash` function.
             *
             * @memberOf _.templateSettings.imports
             * @type {Function}
             */
            "_": lodash
          }
        };
        lodash.prototype = baseLodash.prototype;
        lodash.prototype.constructor = lodash;
        LodashWrapper.prototype = baseCreate(baseLodash.prototype);
        LodashWrapper.prototype.constructor = LodashWrapper;
        function LazyWrapper(value) {
          this.__wrapped__ = value;
          this.__actions__ = [];
          this.__dir__ = 1;
          this.__filtered__ = false;
          this.__iteratees__ = [];
          this.__takeCount__ = MAX_ARRAY_LENGTH;
          this.__views__ = [];
        }
        function lazyClone() {
          var result2 = new LazyWrapper(this.__wrapped__);
          result2.__actions__ = copyArray(this.__actions__);
          result2.__dir__ = this.__dir__;
          result2.__filtered__ = this.__filtered__;
          result2.__iteratees__ = copyArray(this.__iteratees__);
          result2.__takeCount__ = this.__takeCount__;
          result2.__views__ = copyArray(this.__views__);
          return result2;
        }
        function lazyReverse() {
          if (this.__filtered__) {
            var result2 = new LazyWrapper(this);
            result2.__dir__ = -1;
            result2.__filtered__ = true;
          } else {
            result2 = this.clone();
            result2.__dir__ *= -1;
          }
          return result2;
        }
        function lazyValue() {
          var array = this.__wrapped__.value(), dir = this.__dir__, isArr = isArray(array), isRight = dir < 0, arrLength = isArr ? array.length : 0, view = getView(0, arrLength, this.__views__), start = view.start, end = view.end, length = end - start, index = isRight ? end : start - 1, iteratees = this.__iteratees__, iterLength = iteratees.length, resIndex = 0, takeCount = nativeMin(length, this.__takeCount__);
          if (!isArr || !isRight && arrLength == length && takeCount == length) {
            return baseWrapperValue(array, this.__actions__);
          }
          var result2 = [];
          outer:
            while (length-- && resIndex < takeCount) {
              index += dir;
              var iterIndex = -1, value = array[index];
              while (++iterIndex < iterLength) {
                var data = iteratees[iterIndex], iteratee2 = data.iteratee, type = data.type, computed = iteratee2(value);
                if (type == LAZY_MAP_FLAG) {
                  value = computed;
                } else if (!computed) {
                  if (type == LAZY_FILTER_FLAG) {
                    continue outer;
                  } else {
                    break outer;
                  }
                }
              }
              result2[resIndex++] = value;
            }
          return result2;
        }
        LazyWrapper.prototype = baseCreate(baseLodash.prototype);
        LazyWrapper.prototype.constructor = LazyWrapper;
        function Hash(entries) {
          var index = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index < length) {
            var entry = entries[index];
            this.set(entry[0], entry[1]);
          }
        }
        function hashClear() {
          this.__data__ = nativeCreate ? nativeCreate(null) : {};
          this.size = 0;
        }
        function hashDelete(key) {
          var result2 = this.has(key) && delete this.__data__[key];
          this.size -= result2 ? 1 : 0;
          return result2;
        }
        function hashGet(key) {
          var data = this.__data__;
          if (nativeCreate) {
            var result2 = data[key];
            return result2 === HASH_UNDEFINED ? undefined2 : result2;
          }
          return hasOwnProperty.call(data, key) ? data[key] : undefined2;
        }
        function hashHas(key) {
          var data = this.__data__;
          return nativeCreate ? data[key] !== undefined2 : hasOwnProperty.call(data, key);
        }
        function hashSet(key, value) {
          var data = this.__data__;
          this.size += this.has(key) ? 0 : 1;
          data[key] = nativeCreate && value === undefined2 ? HASH_UNDEFINED : value;
          return this;
        }
        Hash.prototype.clear = hashClear;
        Hash.prototype["delete"] = hashDelete;
        Hash.prototype.get = hashGet;
        Hash.prototype.has = hashHas;
        Hash.prototype.set = hashSet;
        function ListCache(entries) {
          var index = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index < length) {
            var entry = entries[index];
            this.set(entry[0], entry[1]);
          }
        }
        function listCacheClear() {
          this.__data__ = [];
          this.size = 0;
        }
        function listCacheDelete(key) {
          var data = this.__data__, index = assocIndexOf(data, key);
          if (index < 0) {
            return false;
          }
          var lastIndex = data.length - 1;
          if (index == lastIndex) {
            data.pop();
          } else {
            splice.call(data, index, 1);
          }
          --this.size;
          return true;
        }
        function listCacheGet(key) {
          var data = this.__data__, index = assocIndexOf(data, key);
          return index < 0 ? undefined2 : data[index][1];
        }
        function listCacheHas(key) {
          return assocIndexOf(this.__data__, key) > -1;
        }
        function listCacheSet(key, value) {
          var data = this.__data__, index = assocIndexOf(data, key);
          if (index < 0) {
            ++this.size;
            data.push([key, value]);
          } else {
            data[index][1] = value;
          }
          return this;
        }
        ListCache.prototype.clear = listCacheClear;
        ListCache.prototype["delete"] = listCacheDelete;
        ListCache.prototype.get = listCacheGet;
        ListCache.prototype.has = listCacheHas;
        ListCache.prototype.set = listCacheSet;
        function MapCache(entries) {
          var index = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index < length) {
            var entry = entries[index];
            this.set(entry[0], entry[1]);
          }
        }
        function mapCacheClear() {
          this.size = 0;
          this.__data__ = {
            "hash": new Hash(),
            "map": new (Map2 || ListCache)(),
            "string": new Hash()
          };
        }
        function mapCacheDelete(key) {
          var result2 = getMapData(this, key)["delete"](key);
          this.size -= result2 ? 1 : 0;
          return result2;
        }
        function mapCacheGet(key) {
          return getMapData(this, key).get(key);
        }
        function mapCacheHas(key) {
          return getMapData(this, key).has(key);
        }
        function mapCacheSet(key, value) {
          var data = getMapData(this, key), size2 = data.size;
          data.set(key, value);
          this.size += data.size == size2 ? 0 : 1;
          return this;
        }
        MapCache.prototype.clear = mapCacheClear;
        MapCache.prototype["delete"] = mapCacheDelete;
        MapCache.prototype.get = mapCacheGet;
        MapCache.prototype.has = mapCacheHas;
        MapCache.prototype.set = mapCacheSet;
        function SetCache(values2) {
          var index = -1, length = values2 == null ? 0 : values2.length;
          this.__data__ = new MapCache();
          while (++index < length) {
            this.add(values2[index]);
          }
        }
        function setCacheAdd(value) {
          this.__data__.set(value, HASH_UNDEFINED);
          return this;
        }
        function setCacheHas(value) {
          return this.__data__.has(value);
        }
        SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
        SetCache.prototype.has = setCacheHas;
        function Stack(entries) {
          var data = this.__data__ = new ListCache(entries);
          this.size = data.size;
        }
        function stackClear() {
          this.__data__ = new ListCache();
          this.size = 0;
        }
        function stackDelete(key) {
          var data = this.__data__, result2 = data["delete"](key);
          this.size = data.size;
          return result2;
        }
        function stackGet(key) {
          return this.__data__.get(key);
        }
        function stackHas(key) {
          return this.__data__.has(key);
        }
        function stackSet(key, value) {
          var data = this.__data__;
          if (data instanceof ListCache) {
            var pairs = data.__data__;
            if (!Map2 || pairs.length < LARGE_ARRAY_SIZE - 1) {
              pairs.push([key, value]);
              this.size = ++data.size;
              return this;
            }
            data = this.__data__ = new MapCache(pairs);
          }
          data.set(key, value);
          this.size = data.size;
          return this;
        }
        Stack.prototype.clear = stackClear;
        Stack.prototype["delete"] = stackDelete;
        Stack.prototype.get = stackGet;
        Stack.prototype.has = stackHas;
        Stack.prototype.set = stackSet;
        function arrayLikeKeys(value, inherited) {
          var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result2 = skipIndexes ? baseTimes(value.length, String2) : [], length = result2.length;
          for (var key in value) {
            if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
            (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
            isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
            isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
            isIndex(key, length)))) {
              result2.push(key);
            }
          }
          return result2;
        }
        function arraySample(array) {
          var length = array.length;
          return length ? array[baseRandom(0, length - 1)] : undefined2;
        }
        function arraySampleSize(array, n) {
          return shuffleSelf(copyArray(array), baseClamp(n, 0, array.length));
        }
        function arrayShuffle(array) {
          return shuffleSelf(copyArray(array));
        }
        function assignMergeValue(object, key, value) {
          if (value !== undefined2 && !eq(object[key], value) || value === undefined2 && !(key in object)) {
            baseAssignValue(object, key, value);
          }
        }
        function assignValue(object, key, value) {
          var objValue = object[key];
          if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || value === undefined2 && !(key in object)) {
            baseAssignValue(object, key, value);
          }
        }
        function assocIndexOf(array, key) {
          var length = array.length;
          while (length--) {
            if (eq(array[length][0], key)) {
              return length;
            }
          }
          return -1;
        }
        function baseAggregator(collection, setter, iteratee2, accumulator) {
          baseEach(collection, function(value, key, collection2) {
            setter(accumulator, value, iteratee2(value), collection2);
          });
          return accumulator;
        }
        function baseAssign(object, source) {
          return object && copyObject(source, keys(source), object);
        }
        function baseAssignIn(object, source) {
          return object && copyObject(source, keysIn(source), object);
        }
        function baseAssignValue(object, key, value) {
          if (key == "__proto__" && defineProperty) {
            defineProperty(object, key, {
              "configurable": true,
              "enumerable": true,
              "value": value,
              "writable": true
            });
          } else {
            object[key] = value;
          }
        }
        function baseAt(object, paths) {
          var index = -1, length = paths.length, result2 = Array2(length), skip = object == null;
          while (++index < length) {
            result2[index] = skip ? undefined2 : get(object, paths[index]);
          }
          return result2;
        }
        function baseClamp(number, lower, upper) {
          if (number === number) {
            if (upper !== undefined2) {
              number = number <= upper ? number : upper;
            }
            if (lower !== undefined2) {
              number = number >= lower ? number : lower;
            }
          }
          return number;
        }
        function baseClone(value, bitmask, customizer, key, object, stack) {
          var result2, isDeep = bitmask & CLONE_DEEP_FLAG, isFlat = bitmask & CLONE_FLAT_FLAG, isFull = bitmask & CLONE_SYMBOLS_FLAG;
          if (customizer) {
            result2 = object ? customizer(value, key, object, stack) : customizer(value);
          }
          if (result2 !== undefined2) {
            return result2;
          }
          if (!isObject(value)) {
            return value;
          }
          var isArr = isArray(value);
          if (isArr) {
            result2 = initCloneArray(value);
            if (!isDeep) {
              return copyArray(value, result2);
            }
          } else {
            var tag = getTag(value), isFunc = tag == funcTag || tag == genTag;
            if (isBuffer(value)) {
              return cloneBuffer(value, isDeep);
            }
            if (tag == objectTag || tag == argsTag || isFunc && !object) {
              result2 = isFlat || isFunc ? {} : initCloneObject(value);
              if (!isDeep) {
                return isFlat ? copySymbolsIn(value, baseAssignIn(result2, value)) : copySymbols(value, baseAssign(result2, value));
              }
            } else {
              if (!cloneableTags[tag]) {
                return object ? value : {};
              }
              result2 = initCloneByTag(value, tag, isDeep);
            }
          }
          stack || (stack = new Stack());
          var stacked = stack.get(value);
          if (stacked) {
            return stacked;
          }
          stack.set(value, result2);
          if (isSet(value)) {
            value.forEach(function(subValue) {
              result2.add(baseClone(subValue, bitmask, customizer, subValue, value, stack));
            });
          } else if (isMap(value)) {
            value.forEach(function(subValue, key2) {
              result2.set(key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
            });
          }
          var keysFunc = isFull ? isFlat ? getAllKeysIn : getAllKeys : isFlat ? keysIn : keys;
          var props = isArr ? undefined2 : keysFunc(value);
          arrayEach(props || value, function(subValue, key2) {
            if (props) {
              key2 = subValue;
              subValue = value[key2];
            }
            assignValue(result2, key2, baseClone(subValue, bitmask, customizer, key2, value, stack));
          });
          return result2;
        }
        function baseConforms(source) {
          var props = keys(source);
          return function(object) {
            return baseConformsTo(object, source, props);
          };
        }
        function baseConformsTo(object, source, props) {
          var length = props.length;
          if (object == null) {
            return !length;
          }
          object = Object2(object);
          while (length--) {
            var key = props[length], predicate = source[key], value = object[key];
            if (value === undefined2 && !(key in object) || !predicate(value)) {
              return false;
            }
          }
          return true;
        }
        function baseDelay(func, wait, args) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          return setTimeout2(function() {
            func.apply(undefined2, args);
          }, wait);
        }
        function baseDifference(array, values2, iteratee2, comparator) {
          var index = -1, includes2 = arrayIncludes, isCommon = true, length = array.length, result2 = [], valuesLength = values2.length;
          if (!length) {
            return result2;
          }
          if (iteratee2) {
            values2 = arrayMap(values2, baseUnary(iteratee2));
          }
          if (comparator) {
            includes2 = arrayIncludesWith;
            isCommon = false;
          } else if (values2.length >= LARGE_ARRAY_SIZE) {
            includes2 = cacheHas;
            isCommon = false;
            values2 = new SetCache(values2);
          }
          outer:
            while (++index < length) {
              var value = array[index], computed = iteratee2 == null ? value : iteratee2(value);
              value = comparator || value !== 0 ? value : 0;
              if (isCommon && computed === computed) {
                var valuesIndex = valuesLength;
                while (valuesIndex--) {
                  if (values2[valuesIndex] === computed) {
                    continue outer;
                  }
                }
                result2.push(value);
              } else if (!includes2(values2, computed, comparator)) {
                result2.push(value);
              }
            }
          return result2;
        }
        var baseEach = createBaseEach(baseForOwn);
        var baseEachRight = createBaseEach(baseForOwnRight, true);
        function baseEvery(collection, predicate) {
          var result2 = true;
          baseEach(collection, function(value, index, collection2) {
            result2 = !!predicate(value, index, collection2);
            return result2;
          });
          return result2;
        }
        function baseExtremum(array, iteratee2, comparator) {
          var index = -1, length = array.length;
          while (++index < length) {
            var value = array[index], current = iteratee2(value);
            if (current != null && (computed === undefined2 ? current === current && !isSymbol(current) : comparator(current, computed))) {
              var computed = current, result2 = value;
            }
          }
          return result2;
        }
        function baseFill(array, value, start, end) {
          var length = array.length;
          start = toInteger(start);
          if (start < 0) {
            start = -start > length ? 0 : length + start;
          }
          end = end === undefined2 || end > length ? length : toInteger(end);
          if (end < 0) {
            end += length;
          }
          end = start > end ? 0 : toLength(end);
          while (start < end) {
            array[start++] = value;
          }
          return array;
        }
        function baseFilter(collection, predicate) {
          var result2 = [];
          baseEach(collection, function(value, index, collection2) {
            if (predicate(value, index, collection2)) {
              result2.push(value);
            }
          });
          return result2;
        }
        function baseFlatten(array, depth, predicate, isStrict, result2) {
          var index = -1, length = array.length;
          predicate || (predicate = isFlattenable);
          result2 || (result2 = []);
          while (++index < length) {
            var value = array[index];
            if (depth > 0 && predicate(value)) {
              if (depth > 1) {
                baseFlatten(value, depth - 1, predicate, isStrict, result2);
              } else {
                arrayPush(result2, value);
              }
            } else if (!isStrict) {
              result2[result2.length] = value;
            }
          }
          return result2;
        }
        var baseFor = createBaseFor();
        var baseForRight = createBaseFor(true);
        function baseForOwn(object, iteratee2) {
          return object && baseFor(object, iteratee2, keys);
        }
        function baseForOwnRight(object, iteratee2) {
          return object && baseForRight(object, iteratee2, keys);
        }
        function baseFunctions(object, props) {
          return arrayFilter(props, function(key) {
            return isFunction(object[key]);
          });
        }
        function baseGet(object, path) {
          path = castPath(path, object);
          var index = 0, length = path.length;
          while (object != null && index < length) {
            object = object[toKey(path[index++])];
          }
          return index && index == length ? object : undefined2;
        }
        function baseGetAllKeys(object, keysFunc, symbolsFunc) {
          var result2 = keysFunc(object);
          return isArray(object) ? result2 : arrayPush(result2, symbolsFunc(object));
        }
        function baseGetTag(value) {
          if (value == null) {
            return value === undefined2 ? undefinedTag : nullTag;
          }
          return symToStringTag && symToStringTag in Object2(value) ? getRawTag(value) : objectToString(value);
        }
        function baseGt(value, other) {
          return value > other;
        }
        function baseHas(object, key) {
          return object != null && hasOwnProperty.call(object, key);
        }
        function baseHasIn(object, key) {
          return object != null && key in Object2(object);
        }
        function baseInRange(number, start, end) {
          return number >= nativeMin(start, end) && number < nativeMax(start, end);
        }
        function baseIntersection(arrays, iteratee2, comparator) {
          var includes2 = comparator ? arrayIncludesWith : arrayIncludes, length = arrays[0].length, othLength = arrays.length, othIndex = othLength, caches = Array2(othLength), maxLength = Infinity, result2 = [];
          while (othIndex--) {
            var array = arrays[othIndex];
            if (othIndex && iteratee2) {
              array = arrayMap(array, baseUnary(iteratee2));
            }
            maxLength = nativeMin(array.length, maxLength);
            caches[othIndex] = !comparator && (iteratee2 || length >= 120 && array.length >= 120) ? new SetCache(othIndex && array) : undefined2;
          }
          array = arrays[0];
          var index = -1, seen = caches[0];
          outer:
            while (++index < length && result2.length < maxLength) {
              var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
              value = comparator || value !== 0 ? value : 0;
              if (!(seen ? cacheHas(seen, computed) : includes2(result2, computed, comparator))) {
                othIndex = othLength;
                while (--othIndex) {
                  var cache = caches[othIndex];
                  if (!(cache ? cacheHas(cache, computed) : includes2(arrays[othIndex], computed, comparator))) {
                    continue outer;
                  }
                }
                if (seen) {
                  seen.push(computed);
                }
                result2.push(value);
              }
            }
          return result2;
        }
        function baseInverter(object, setter, iteratee2, accumulator) {
          baseForOwn(object, function(value, key, object2) {
            setter(accumulator, iteratee2(value), key, object2);
          });
          return accumulator;
        }
        function baseInvoke(object, path, args) {
          path = castPath(path, object);
          object = parent(object, path);
          var func = object == null ? object : object[toKey(last(path))];
          return func == null ? undefined2 : apply(func, object, args);
        }
        function baseIsArguments(value) {
          return isObjectLike(value) && baseGetTag(value) == argsTag;
        }
        function baseIsArrayBuffer(value) {
          return isObjectLike(value) && baseGetTag(value) == arrayBufferTag;
        }
        function baseIsDate(value) {
          return isObjectLike(value) && baseGetTag(value) == dateTag;
        }
        function baseIsEqual(value, other, bitmask, customizer, stack) {
          if (value === other) {
            return true;
          }
          if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
            return value !== value && other !== other;
          }
          return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
        }
        function baseIsEqualDeep(object, other, bitmask, customizer, equalFunc, stack) {
          var objIsArr = isArray(object), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object), othTag = othIsArr ? arrayTag : getTag(other);
          objTag = objTag == argsTag ? objectTag : objTag;
          othTag = othTag == argsTag ? objectTag : othTag;
          var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
          if (isSameTag && isBuffer(object)) {
            if (!isBuffer(other)) {
              return false;
            }
            objIsArr = true;
            objIsObj = false;
          }
          if (isSameTag && !objIsObj) {
            stack || (stack = new Stack());
            return objIsArr || isTypedArray(object) ? equalArrays(object, other, bitmask, customizer, equalFunc, stack) : equalByTag(object, other, objTag, bitmask, customizer, equalFunc, stack);
          }
          if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
            var objIsWrapped = objIsObj && hasOwnProperty.call(object, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
            if (objIsWrapped || othIsWrapped) {
              var objUnwrapped = objIsWrapped ? object.value() : object, othUnwrapped = othIsWrapped ? other.value() : other;
              stack || (stack = new Stack());
              return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
            }
          }
          if (!isSameTag) {
            return false;
          }
          stack || (stack = new Stack());
          return equalObjects(object, other, bitmask, customizer, equalFunc, stack);
        }
        function baseIsMap(value) {
          return isObjectLike(value) && getTag(value) == mapTag;
        }
        function baseIsMatch(object, source, matchData, customizer) {
          var index = matchData.length, length = index, noCustomizer = !customizer;
          if (object == null) {
            return !length;
          }
          object = Object2(object);
          while (index--) {
            var data = matchData[index];
            if (noCustomizer && data[2] ? data[1] !== object[data[0]] : !(data[0] in object)) {
              return false;
            }
          }
          while (++index < length) {
            data = matchData[index];
            var key = data[0], objValue = object[key], srcValue = data[1];
            if (noCustomizer && data[2]) {
              if (objValue === undefined2 && !(key in object)) {
                return false;
              }
            } else {
              var stack = new Stack();
              if (customizer) {
                var result2 = customizer(objValue, srcValue, key, object, source, stack);
              }
              if (!(result2 === undefined2 ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG, customizer, stack) : result2)) {
                return false;
              }
            }
          }
          return true;
        }
        function baseIsNative(value) {
          if (!isObject(value) || isMasked(value)) {
            return false;
          }
          var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
          return pattern.test(toSource(value));
        }
        function baseIsRegExp(value) {
          return isObjectLike(value) && baseGetTag(value) == regexpTag;
        }
        function baseIsSet(value) {
          return isObjectLike(value) && getTag(value) == setTag;
        }
        function baseIsTypedArray(value) {
          return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
        }
        function baseIteratee(value) {
          if (typeof value == "function") {
            return value;
          }
          if (value == null) {
            return identity;
          }
          if (typeof value == "object") {
            return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
          }
          return property(value);
        }
        function baseKeys(object) {
          if (!isPrototype(object)) {
            return nativeKeys(object);
          }
          var result2 = [];
          for (var key in Object2(object)) {
            if (hasOwnProperty.call(object, key) && key != "constructor") {
              result2.push(key);
            }
          }
          return result2;
        }
        function baseKeysIn(object) {
          if (!isObject(object)) {
            return nativeKeysIn(object);
          }
          var isProto = isPrototype(object), result2 = [];
          for (var key in object) {
            if (!(key == "constructor" && (isProto || !hasOwnProperty.call(object, key)))) {
              result2.push(key);
            }
          }
          return result2;
        }
        function baseLt(value, other) {
          return value < other;
        }
        function baseMap(collection, iteratee2) {
          var index = -1, result2 = isArrayLike(collection) ? Array2(collection.length) : [];
          baseEach(collection, function(value, key, collection2) {
            result2[++index] = iteratee2(value, key, collection2);
          });
          return result2;
        }
        function baseMatches(source) {
          var matchData = getMatchData(source);
          if (matchData.length == 1 && matchData[0][2]) {
            return matchesStrictComparable(matchData[0][0], matchData[0][1]);
          }
          return function(object) {
            return object === source || baseIsMatch(object, source, matchData);
          };
        }
        function baseMatchesProperty(path, srcValue) {
          if (isKey(path) && isStrictComparable(srcValue)) {
            return matchesStrictComparable(toKey(path), srcValue);
          }
          return function(object) {
            var objValue = get(object, path);
            return objValue === undefined2 && objValue === srcValue ? hasIn(object, path) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
          };
        }
        function baseMerge(object, source, srcIndex, customizer, stack) {
          if (object === source) {
            return;
          }
          baseFor(source, function(srcValue, key) {
            stack || (stack = new Stack());
            if (isObject(srcValue)) {
              baseMergeDeep(object, source, key, srcIndex, baseMerge, customizer, stack);
            } else {
              var newValue = customizer ? customizer(safeGet(object, key), srcValue, key + "", object, source, stack) : undefined2;
              if (newValue === undefined2) {
                newValue = srcValue;
              }
              assignMergeValue(object, key, newValue);
            }
          }, keysIn);
        }
        function baseMergeDeep(object, source, key, srcIndex, mergeFunc, customizer, stack) {
          var objValue = safeGet(object, key), srcValue = safeGet(source, key), stacked = stack.get(srcValue);
          if (stacked) {
            assignMergeValue(object, key, stacked);
            return;
          }
          var newValue = customizer ? customizer(objValue, srcValue, key + "", object, source, stack) : undefined2;
          var isCommon = newValue === undefined2;
          if (isCommon) {
            var isArr = isArray(srcValue), isBuff = !isArr && isBuffer(srcValue), isTyped = !isArr && !isBuff && isTypedArray(srcValue);
            newValue = srcValue;
            if (isArr || isBuff || isTyped) {
              if (isArray(objValue)) {
                newValue = objValue;
              } else if (isArrayLikeObject(objValue)) {
                newValue = copyArray(objValue);
              } else if (isBuff) {
                isCommon = false;
                newValue = cloneBuffer(srcValue, true);
              } else if (isTyped) {
                isCommon = false;
                newValue = cloneTypedArray(srcValue, true);
              } else {
                newValue = [];
              }
            } else if (isPlainObject(srcValue) || isArguments(srcValue)) {
              newValue = objValue;
              if (isArguments(objValue)) {
                newValue = toPlainObject(objValue);
              } else if (!isObject(objValue) || isFunction(objValue)) {
                newValue = initCloneObject(srcValue);
              }
            } else {
              isCommon = false;
            }
          }
          if (isCommon) {
            stack.set(srcValue, newValue);
            mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
            stack["delete"](srcValue);
          }
          assignMergeValue(object, key, newValue);
        }
        function baseNth(array, n) {
          var length = array.length;
          if (!length) {
            return;
          }
          n += n < 0 ? length : 0;
          return isIndex(n, length) ? array[n] : undefined2;
        }
        function baseOrderBy(collection, iteratees, orders) {
          if (iteratees.length) {
            iteratees = arrayMap(iteratees, function(iteratee2) {
              if (isArray(iteratee2)) {
                return function(value) {
                  return baseGet(value, iteratee2.length === 1 ? iteratee2[0] : iteratee2);
                };
              }
              return iteratee2;
            });
          } else {
            iteratees = [identity];
          }
          var index = -1;
          iteratees = arrayMap(iteratees, baseUnary(getIteratee()));
          var result2 = baseMap(collection, function(value, key, collection2) {
            var criteria = arrayMap(iteratees, function(iteratee2) {
              return iteratee2(value);
            });
            return { "criteria": criteria, "index": ++index, "value": value };
          });
          return baseSortBy(result2, function(object, other) {
            return compareMultiple(object, other, orders);
          });
        }
        function basePick(object, paths) {
          return basePickBy(object, paths, function(value, path) {
            return hasIn(object, path);
          });
        }
        function basePickBy(object, paths, predicate) {
          var index = -1, length = paths.length, result2 = {};
          while (++index < length) {
            var path = paths[index], value = baseGet(object, path);
            if (predicate(value, path)) {
              baseSet(result2, castPath(path, object), value);
            }
          }
          return result2;
        }
        function basePropertyDeep(path) {
          return function(object) {
            return baseGet(object, path);
          };
        }
        function basePullAll(array, values2, iteratee2, comparator) {
          var indexOf2 = comparator ? baseIndexOfWith : baseIndexOf, index = -1, length = values2.length, seen = array;
          if (array === values2) {
            values2 = copyArray(values2);
          }
          if (iteratee2) {
            seen = arrayMap(array, baseUnary(iteratee2));
          }
          while (++index < length) {
            var fromIndex = 0, value = values2[index], computed = iteratee2 ? iteratee2(value) : value;
            while ((fromIndex = indexOf2(seen, computed, fromIndex, comparator)) > -1) {
              if (seen !== array) {
                splice.call(seen, fromIndex, 1);
              }
              splice.call(array, fromIndex, 1);
            }
          }
          return array;
        }
        function basePullAt(array, indexes) {
          var length = array ? indexes.length : 0, lastIndex = length - 1;
          while (length--) {
            var index = indexes[length];
            if (length == lastIndex || index !== previous) {
              var previous = index;
              if (isIndex(index)) {
                splice.call(array, index, 1);
              } else {
                baseUnset(array, index);
              }
            }
          }
          return array;
        }
        function baseRandom(lower, upper) {
          return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
        }
        function baseRange(start, end, step, fromRight) {
          var index = -1, length = nativeMax(nativeCeil((end - start) / (step || 1)), 0), result2 = Array2(length);
          while (length--) {
            result2[fromRight ? length : ++index] = start;
            start += step;
          }
          return result2;
        }
        function baseRepeat(string, n) {
          var result2 = "";
          if (!string || n < 1 || n > MAX_SAFE_INTEGER) {
            return result2;
          }
          do {
            if (n % 2) {
              result2 += string;
            }
            n = nativeFloor(n / 2);
            if (n) {
              string += string;
            }
          } while (n);
          return result2;
        }
        function baseRest(func, start) {
          return setToString(overRest(func, start, identity), func + "");
        }
        function baseSample(collection) {
          return arraySample(values(collection));
        }
        function baseSampleSize(collection, n) {
          var array = values(collection);
          return shuffleSelf(array, baseClamp(n, 0, array.length));
        }
        function baseSet(object, path, value, customizer) {
          if (!isObject(object)) {
            return object;
          }
          path = castPath(path, object);
          var index = -1, length = path.length, lastIndex = length - 1, nested = object;
          while (nested != null && ++index < length) {
            var key = toKey(path[index]), newValue = value;
            if (key === "__proto__" || key === "constructor" || key === "prototype") {
              return object;
            }
            if (index != lastIndex) {
              var objValue = nested[key];
              newValue = customizer ? customizer(objValue, key, nested) : undefined2;
              if (newValue === undefined2) {
                newValue = isObject(objValue) ? objValue : isIndex(path[index + 1]) ? [] : {};
              }
            }
            assignValue(nested, key, newValue);
            nested = nested[key];
          }
          return object;
        }
        var baseSetData = !metaMap ? identity : function(func, data) {
          metaMap.set(func, data);
          return func;
        };
        var baseSetToString = !defineProperty ? identity : function(func, string) {
          return defineProperty(func, "toString", {
            "configurable": true,
            "enumerable": false,
            "value": constant(string),
            "writable": true
          });
        };
        function baseShuffle(collection) {
          return shuffleSelf(values(collection));
        }
        function baseSlice(array, start, end) {
          var index = -1, length = array.length;
          if (start < 0) {
            start = -start > length ? 0 : length + start;
          }
          end = end > length ? length : end;
          if (end < 0) {
            end += length;
          }
          length = start > end ? 0 : end - start >>> 0;
          start >>>= 0;
          var result2 = Array2(length);
          while (++index < length) {
            result2[index] = array[index + start];
          }
          return result2;
        }
        function baseSome(collection, predicate) {
          var result2;
          baseEach(collection, function(value, index, collection2) {
            result2 = predicate(value, index, collection2);
            return !result2;
          });
          return !!result2;
        }
        function baseSortedIndex(array, value, retHighest) {
          var low = 0, high = array == null ? low : array.length;
          if (typeof value == "number" && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
            while (low < high) {
              var mid = low + high >>> 1, computed = array[mid];
              if (computed !== null && !isSymbol(computed) && (retHighest ? computed <= value : computed < value)) {
                low = mid + 1;
              } else {
                high = mid;
              }
            }
            return high;
          }
          return baseSortedIndexBy(array, value, identity, retHighest);
        }
        function baseSortedIndexBy(array, value, iteratee2, retHighest) {
          var low = 0, high = array == null ? 0 : array.length;
          if (high === 0) {
            return 0;
          }
          value = iteratee2(value);
          var valIsNaN = value !== value, valIsNull = value === null, valIsSymbol = isSymbol(value), valIsUndefined = value === undefined2;
          while (low < high) {
            var mid = nativeFloor((low + high) / 2), computed = iteratee2(array[mid]), othIsDefined = computed !== undefined2, othIsNull = computed === null, othIsReflexive = computed === computed, othIsSymbol = isSymbol(computed);
            if (valIsNaN) {
              var setLow = retHighest || othIsReflexive;
            } else if (valIsUndefined) {
              setLow = othIsReflexive && (retHighest || othIsDefined);
            } else if (valIsNull) {
              setLow = othIsReflexive && othIsDefined && (retHighest || !othIsNull);
            } else if (valIsSymbol) {
              setLow = othIsReflexive && othIsDefined && !othIsNull && (retHighest || !othIsSymbol);
            } else if (othIsNull || othIsSymbol) {
              setLow = false;
            } else {
              setLow = retHighest ? computed <= value : computed < value;
            }
            if (setLow) {
              low = mid + 1;
            } else {
              high = mid;
            }
          }
          return nativeMin(high, MAX_ARRAY_INDEX);
        }
        function baseSortedUniq(array, iteratee2) {
          var index = -1, length = array.length, resIndex = 0, result2 = [];
          while (++index < length) {
            var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
            if (!index || !eq(computed, seen)) {
              var seen = computed;
              result2[resIndex++] = value === 0 ? 0 : value;
            }
          }
          return result2;
        }
        function baseToNumber(value) {
          if (typeof value == "number") {
            return value;
          }
          if (isSymbol(value)) {
            return NAN;
          }
          return +value;
        }
        function baseToString(value) {
          if (typeof value == "string") {
            return value;
          }
          if (isArray(value)) {
            return arrayMap(value, baseToString) + "";
          }
          if (isSymbol(value)) {
            return symbolToString ? symbolToString.call(value) : "";
          }
          var result2 = value + "";
          return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
        }
        function baseUniq(array, iteratee2, comparator) {
          var index = -1, includes2 = arrayIncludes, length = array.length, isCommon = true, result2 = [], seen = result2;
          if (comparator) {
            isCommon = false;
            includes2 = arrayIncludesWith;
          } else if (length >= LARGE_ARRAY_SIZE) {
            var set2 = iteratee2 ? null : createSet(array);
            if (set2) {
              return setToArray(set2);
            }
            isCommon = false;
            includes2 = cacheHas;
            seen = new SetCache();
          } else {
            seen = iteratee2 ? [] : result2;
          }
          outer:
            while (++index < length) {
              var value = array[index], computed = iteratee2 ? iteratee2(value) : value;
              value = comparator || value !== 0 ? value : 0;
              if (isCommon && computed === computed) {
                var seenIndex = seen.length;
                while (seenIndex--) {
                  if (seen[seenIndex] === computed) {
                    continue outer;
                  }
                }
                if (iteratee2) {
                  seen.push(computed);
                }
                result2.push(value);
              } else if (!includes2(seen, computed, comparator)) {
                if (seen !== result2) {
                  seen.push(computed);
                }
                result2.push(value);
              }
            }
          return result2;
        }
        function baseUnset(object, path) {
          path = castPath(path, object);
          object = parent(object, path);
          return object == null || delete object[toKey(last(path))];
        }
        function baseUpdate(object, path, updater, customizer) {
          return baseSet(object, path, updater(baseGet(object, path)), customizer);
        }
        function baseWhile(array, predicate, isDrop, fromRight) {
          var length = array.length, index = fromRight ? length : -1;
          while ((fromRight ? index-- : ++index < length) && predicate(array[index], index, array)) {
          }
          return isDrop ? baseSlice(array, fromRight ? 0 : index, fromRight ? index + 1 : length) : baseSlice(array, fromRight ? index + 1 : 0, fromRight ? length : index);
        }
        function baseWrapperValue(value, actions) {
          var result2 = value;
          if (result2 instanceof LazyWrapper) {
            result2 = result2.value();
          }
          return arrayReduce(actions, function(result3, action) {
            return action.func.apply(action.thisArg, arrayPush([result3], action.args));
          }, result2);
        }
        function baseXor(arrays, iteratee2, comparator) {
          var length = arrays.length;
          if (length < 2) {
            return length ? baseUniq(arrays[0]) : [];
          }
          var index = -1, result2 = Array2(length);
          while (++index < length) {
            var array = arrays[index], othIndex = -1;
            while (++othIndex < length) {
              if (othIndex != index) {
                result2[index] = baseDifference(result2[index] || array, arrays[othIndex], iteratee2, comparator);
              }
            }
          }
          return baseUniq(baseFlatten(result2, 1), iteratee2, comparator);
        }
        function baseZipObject(props, values2, assignFunc) {
          var index = -1, length = props.length, valsLength = values2.length, result2 = {};
          while (++index < length) {
            var value = index < valsLength ? values2[index] : undefined2;
            assignFunc(result2, props[index], value);
          }
          return result2;
        }
        function castArrayLikeObject(value) {
          return isArrayLikeObject(value) ? value : [];
        }
        function castFunction(value) {
          return typeof value == "function" ? value : identity;
        }
        function castPath(value, object) {
          if (isArray(value)) {
            return value;
          }
          return isKey(value, object) ? [value] : stringToPath(toString(value));
        }
        var castRest = baseRest;
        function castSlice(array, start, end) {
          var length = array.length;
          end = end === undefined2 ? length : end;
          return !start && end >= length ? array : baseSlice(array, start, end);
        }
        var clearTimeout2 = ctxClearTimeout || function(id) {
          return root.clearTimeout(id);
        };
        function cloneBuffer(buffer, isDeep) {
          if (isDeep) {
            return buffer.slice();
          }
          var length = buffer.length, result2 = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
          buffer.copy(result2);
          return result2;
        }
        function cloneArrayBuffer(arrayBuffer) {
          var result2 = new arrayBuffer.constructor(arrayBuffer.byteLength);
          new Uint8Array2(result2).set(new Uint8Array2(arrayBuffer));
          return result2;
        }
        function cloneDataView(dataView, isDeep) {
          var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
          return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
        }
        function cloneRegExp(regexp) {
          var result2 = new regexp.constructor(regexp.source, reFlags.exec(regexp));
          result2.lastIndex = regexp.lastIndex;
          return result2;
        }
        function cloneSymbol(symbol) {
          return symbolValueOf ? Object2(symbolValueOf.call(symbol)) : {};
        }
        function cloneTypedArray(typedArray, isDeep) {
          var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
          return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
        }
        function compareAscending(value, other) {
          if (value !== other) {
            var valIsDefined = value !== undefined2, valIsNull = value === null, valIsReflexive = value === value, valIsSymbol = isSymbol(value);
            var othIsDefined = other !== undefined2, othIsNull = other === null, othIsReflexive = other === other, othIsSymbol = isSymbol(other);
            if (!othIsNull && !othIsSymbol && !valIsSymbol && value > other || valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol || valIsNull && othIsDefined && othIsReflexive || !valIsDefined && othIsReflexive || !valIsReflexive) {
              return 1;
            }
            if (!valIsNull && !valIsSymbol && !othIsSymbol && value < other || othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol || othIsNull && valIsDefined && valIsReflexive || !othIsDefined && valIsReflexive || !othIsReflexive) {
              return -1;
            }
          }
          return 0;
        }
        function compareMultiple(object, other, orders) {
          var index = -1, objCriteria = object.criteria, othCriteria = other.criteria, length = objCriteria.length, ordersLength = orders.length;
          while (++index < length) {
            var result2 = compareAscending(objCriteria[index], othCriteria[index]);
            if (result2) {
              if (index >= ordersLength) {
                return result2;
              }
              var order = orders[index];
              return result2 * (order == "desc" ? -1 : 1);
            }
          }
          return object.index - other.index;
        }
        function composeArgs(args, partials, holders, isCurried) {
          var argsIndex = -1, argsLength = args.length, holdersLength = holders.length, leftIndex = -1, leftLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(leftLength + rangeLength), isUncurried = !isCurried;
          while (++leftIndex < leftLength) {
            result2[leftIndex] = partials[leftIndex];
          }
          while (++argsIndex < holdersLength) {
            if (isUncurried || argsIndex < argsLength) {
              result2[holders[argsIndex]] = args[argsIndex];
            }
          }
          while (rangeLength--) {
            result2[leftIndex++] = args[argsIndex++];
          }
          return result2;
        }
        function composeArgsRight(args, partials, holders, isCurried) {
          var argsIndex = -1, argsLength = args.length, holdersIndex = -1, holdersLength = holders.length, rightIndex = -1, rightLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(rangeLength + rightLength), isUncurried = !isCurried;
          while (++argsIndex < rangeLength) {
            result2[argsIndex] = args[argsIndex];
          }
          var offset = argsIndex;
          while (++rightIndex < rightLength) {
            result2[offset + rightIndex] = partials[rightIndex];
          }
          while (++holdersIndex < holdersLength) {
            if (isUncurried || argsIndex < argsLength) {
              result2[offset + holders[holdersIndex]] = args[argsIndex++];
            }
          }
          return result2;
        }
        function copyArray(source, array) {
          var index = -1, length = source.length;
          array || (array = Array2(length));
          while (++index < length) {
            array[index] = source[index];
          }
          return array;
        }
        function copyObject(source, props, object, customizer) {
          var isNew = !object;
          object || (object = {});
          var index = -1, length = props.length;
          while (++index < length) {
            var key = props[index];
            var newValue = customizer ? customizer(object[key], source[key], key, object, source) : undefined2;
            if (newValue === undefined2) {
              newValue = source[key];
            }
            if (isNew) {
              baseAssignValue(object, key, newValue);
            } else {
              assignValue(object, key, newValue);
            }
          }
          return object;
        }
        function copySymbols(source, object) {
          return copyObject(source, getSymbols(source), object);
        }
        function copySymbolsIn(source, object) {
          return copyObject(source, getSymbolsIn(source), object);
        }
        function createAggregator(setter, initializer) {
          return function(collection, iteratee2) {
            var func = isArray(collection) ? arrayAggregator : baseAggregator, accumulator = initializer ? initializer() : {};
            return func(collection, setter, getIteratee(iteratee2, 2), accumulator);
          };
        }
        function createAssigner(assigner) {
          return baseRest(function(object, sources) {
            var index = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : undefined2, guard = length > 2 ? sources[2] : undefined2;
            customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : undefined2;
            if (guard && isIterateeCall(sources[0], sources[1], guard)) {
              customizer = length < 3 ? undefined2 : customizer;
              length = 1;
            }
            object = Object2(object);
            while (++index < length) {
              var source = sources[index];
              if (source) {
                assigner(object, source, index, customizer);
              }
            }
            return object;
          });
        }
        function createBaseEach(eachFunc, fromRight) {
          return function(collection, iteratee2) {
            if (collection == null) {
              return collection;
            }
            if (!isArrayLike(collection)) {
              return eachFunc(collection, iteratee2);
            }
            var length = collection.length, index = fromRight ? length : -1, iterable = Object2(collection);
            while (fromRight ? index-- : ++index < length) {
              if (iteratee2(iterable[index], index, iterable) === false) {
                break;
              }
            }
            return collection;
          };
        }
        function createBaseFor(fromRight) {
          return function(object, iteratee2, keysFunc) {
            var index = -1, iterable = Object2(object), props = keysFunc(object), length = props.length;
            while (length--) {
              var key = props[fromRight ? length : ++index];
              if (iteratee2(iterable[key], key, iterable) === false) {
                break;
              }
            }
            return object;
          };
        }
        function createBind(func, bitmask, thisArg) {
          var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
          function wrapper() {
            var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            return fn.apply(isBind ? thisArg : this, arguments);
          }
          return wrapper;
        }
        function createCaseFirst(methodName) {
          return function(string) {
            string = toString(string);
            var strSymbols = hasUnicode(string) ? stringToArray(string) : undefined2;
            var chr = strSymbols ? strSymbols[0] : string.charAt(0);
            var trailing = strSymbols ? castSlice(strSymbols, 1).join("") : string.slice(1);
            return chr[methodName]() + trailing;
          };
        }
        function createCompounder(callback) {
          return function(string) {
            return arrayReduce(words(deburr(string).replace(reApos, "")), callback, "");
          };
        }
        function createCtor(Ctor) {
          return function() {
            var args = arguments;
            switch (args.length) {
              case 0:
                return new Ctor();
              case 1:
                return new Ctor(args[0]);
              case 2:
                return new Ctor(args[0], args[1]);
              case 3:
                return new Ctor(args[0], args[1], args[2]);
              case 4:
                return new Ctor(args[0], args[1], args[2], args[3]);
              case 5:
                return new Ctor(args[0], args[1], args[2], args[3], args[4]);
              case 6:
                return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
              case 7:
                return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
            }
            var thisBinding = baseCreate(Ctor.prototype), result2 = Ctor.apply(thisBinding, args);
            return isObject(result2) ? result2 : thisBinding;
          };
        }
        function createCurry(func, bitmask, arity) {
          var Ctor = createCtor(func);
          function wrapper() {
            var length = arguments.length, args = Array2(length), index = length, placeholder = getHolder(wrapper);
            while (index--) {
              args[index] = arguments[index];
            }
            var holders = length < 3 && args[0] !== placeholder && args[length - 1] !== placeholder ? [] : replaceHolders(args, placeholder);
            length -= holders.length;
            if (length < arity) {
              return createRecurry(
                func,
                bitmask,
                createHybrid,
                wrapper.placeholder,
                undefined2,
                args,
                holders,
                undefined2,
                undefined2,
                arity - length
              );
            }
            var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            return apply(fn, this, args);
          }
          return wrapper;
        }
        function createFind(findIndexFunc) {
          return function(collection, predicate, fromIndex) {
            var iterable = Object2(collection);
            if (!isArrayLike(collection)) {
              var iteratee2 = getIteratee(predicate, 3);
              collection = keys(collection);
              predicate = function(key) {
                return iteratee2(iterable[key], key, iterable);
              };
            }
            var index = findIndexFunc(collection, predicate, fromIndex);
            return index > -1 ? iterable[iteratee2 ? collection[index] : index] : undefined2;
          };
        }
        function createFlow(fromRight) {
          return flatRest(function(funcs) {
            var length = funcs.length, index = length, prereq = LodashWrapper.prototype.thru;
            if (fromRight) {
              funcs.reverse();
            }
            while (index--) {
              var func = funcs[index];
              if (typeof func != "function") {
                throw new TypeError2(FUNC_ERROR_TEXT);
              }
              if (prereq && !wrapper && getFuncName(func) == "wrapper") {
                var wrapper = new LodashWrapper([], true);
              }
            }
            index = wrapper ? index : length;
            while (++index < length) {
              func = funcs[index];
              var funcName = getFuncName(func), data = funcName == "wrapper" ? getData(func) : undefined2;
              if (data && isLaziable(data[0]) && data[1] == (WRAP_ARY_FLAG | WRAP_CURRY_FLAG | WRAP_PARTIAL_FLAG | WRAP_REARG_FLAG) && !data[4].length && data[9] == 1) {
                wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
              } else {
                wrapper = func.length == 1 && isLaziable(func) ? wrapper[funcName]() : wrapper.thru(func);
              }
            }
            return function() {
              var args = arguments, value = args[0];
              if (wrapper && args.length == 1 && isArray(value)) {
                return wrapper.plant(value).value();
              }
              var index2 = 0, result2 = length ? funcs[index2].apply(this, args) : value;
              while (++index2 < length) {
                result2 = funcs[index2].call(this, result2);
              }
              return result2;
            };
          });
        }
        function createHybrid(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary2, arity) {
          var isAry = bitmask & WRAP_ARY_FLAG, isBind = bitmask & WRAP_BIND_FLAG, isBindKey = bitmask & WRAP_BIND_KEY_FLAG, isCurried = bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG), isFlip = bitmask & WRAP_FLIP_FLAG, Ctor = isBindKey ? undefined2 : createCtor(func);
          function wrapper() {
            var length = arguments.length, args = Array2(length), index = length;
            while (index--) {
              args[index] = arguments[index];
            }
            if (isCurried) {
              var placeholder = getHolder(wrapper), holdersCount = countHolders(args, placeholder);
            }
            if (partials) {
              args = composeArgs(args, partials, holders, isCurried);
            }
            if (partialsRight) {
              args = composeArgsRight(args, partialsRight, holdersRight, isCurried);
            }
            length -= holdersCount;
            if (isCurried && length < arity) {
              var newHolders = replaceHolders(args, placeholder);
              return createRecurry(
                func,
                bitmask,
                createHybrid,
                wrapper.placeholder,
                thisArg,
                args,
                newHolders,
                argPos,
                ary2,
                arity - length
              );
            }
            var thisBinding = isBind ? thisArg : this, fn = isBindKey ? thisBinding[func] : func;
            length = args.length;
            if (argPos) {
              args = reorder(args, argPos);
            } else if (isFlip && length > 1) {
              args.reverse();
            }
            if (isAry && ary2 < length) {
              args.length = ary2;
            }
            if (this && this !== root && this instanceof wrapper) {
              fn = Ctor || createCtor(fn);
            }
            return fn.apply(thisBinding, args);
          }
          return wrapper;
        }
        function createInverter(setter, toIteratee) {
          return function(object, iteratee2) {
            return baseInverter(object, setter, toIteratee(iteratee2), {});
          };
        }
        function createMathOperation(operator, defaultValue) {
          return function(value, other) {
            var result2;
            if (value === undefined2 && other === undefined2) {
              return defaultValue;
            }
            if (value !== undefined2) {
              result2 = value;
            }
            if (other !== undefined2) {
              if (result2 === undefined2) {
                return other;
              }
              if (typeof value == "string" || typeof other == "string") {
                value = baseToString(value);
                other = baseToString(other);
              } else {
                value = baseToNumber(value);
                other = baseToNumber(other);
              }
              result2 = operator(value, other);
            }
            return result2;
          };
        }
        function createOver(arrayFunc) {
          return flatRest(function(iteratees) {
            iteratees = arrayMap(iteratees, baseUnary(getIteratee()));
            return baseRest(function(args) {
              var thisArg = this;
              return arrayFunc(iteratees, function(iteratee2) {
                return apply(iteratee2, thisArg, args);
              });
            });
          });
        }
        function createPadding(length, chars) {
          chars = chars === undefined2 ? " " : baseToString(chars);
          var charsLength = chars.length;
          if (charsLength < 2) {
            return charsLength ? baseRepeat(chars, length) : chars;
          }
          var result2 = baseRepeat(chars, nativeCeil(length / stringSize(chars)));
          return hasUnicode(chars) ? castSlice(stringToArray(result2), 0, length).join("") : result2.slice(0, length);
        }
        function createPartial(func, bitmask, thisArg, partials) {
          var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
          function wrapper() {
            var argsIndex = -1, argsLength = arguments.length, leftIndex = -1, leftLength = partials.length, args = Array2(leftLength + argsLength), fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            while (++leftIndex < leftLength) {
              args[leftIndex] = partials[leftIndex];
            }
            while (argsLength--) {
              args[leftIndex++] = arguments[++argsIndex];
            }
            return apply(fn, isBind ? thisArg : this, args);
          }
          return wrapper;
        }
        function createRange(fromRight) {
          return function(start, end, step) {
            if (step && typeof step != "number" && isIterateeCall(start, end, step)) {
              end = step = undefined2;
            }
            start = toFinite(start);
            if (end === undefined2) {
              end = start;
              start = 0;
            } else {
              end = toFinite(end);
            }
            step = step === undefined2 ? start < end ? 1 : -1 : toFinite(step);
            return baseRange(start, end, step, fromRight);
          };
        }
        function createRelationalOperation(operator) {
          return function(value, other) {
            if (!(typeof value == "string" && typeof other == "string")) {
              value = toNumber(value);
              other = toNumber(other);
            }
            return operator(value, other);
          };
        }
        function createRecurry(func, bitmask, wrapFunc, placeholder, thisArg, partials, holders, argPos, ary2, arity) {
          var isCurry = bitmask & WRAP_CURRY_FLAG, newHolders = isCurry ? holders : undefined2, newHoldersRight = isCurry ? undefined2 : holders, newPartials = isCurry ? partials : undefined2, newPartialsRight = isCurry ? undefined2 : partials;
          bitmask |= isCurry ? WRAP_PARTIAL_FLAG : WRAP_PARTIAL_RIGHT_FLAG;
          bitmask &= ~(isCurry ? WRAP_PARTIAL_RIGHT_FLAG : WRAP_PARTIAL_FLAG);
          if (!(bitmask & WRAP_CURRY_BOUND_FLAG)) {
            bitmask &= ~(WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG);
          }
          var newData = [
            func,
            bitmask,
            thisArg,
            newPartials,
            newHolders,
            newPartialsRight,
            newHoldersRight,
            argPos,
            ary2,
            arity
          ];
          var result2 = wrapFunc.apply(undefined2, newData);
          if (isLaziable(func)) {
            setData(result2, newData);
          }
          result2.placeholder = placeholder;
          return setWrapToString(result2, func, bitmask);
        }
        function createRound(methodName) {
          var func = Math2[methodName];
          return function(number, precision) {
            number = toNumber(number);
            precision = precision == null ? 0 : nativeMin(toInteger(precision), 292);
            if (precision && nativeIsFinite(number)) {
              var pair = (toString(number) + "e").split("e"), value = func(pair[0] + "e" + (+pair[1] + precision));
              pair = (toString(value) + "e").split("e");
              return +(pair[0] + "e" + (+pair[1] - precision));
            }
            return func(number);
          };
        }
        var createSet = !(Set2 && 1 / setToArray(new Set2([, -0]))[1] == INFINITY) ? noop : function(values2) {
          return new Set2(values2);
        };
        function createToPairs(keysFunc) {
          return function(object) {
            var tag = getTag(object);
            if (tag == mapTag) {
              return mapToArray(object);
            }
            if (tag == setTag) {
              return setToPairs(object);
            }
            return baseToPairs(object, keysFunc(object));
          };
        }
        function createWrap(func, bitmask, thisArg, partials, holders, argPos, ary2, arity) {
          var isBindKey = bitmask & WRAP_BIND_KEY_FLAG;
          if (!isBindKey && typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          var length = partials ? partials.length : 0;
          if (!length) {
            bitmask &= ~(WRAP_PARTIAL_FLAG | WRAP_PARTIAL_RIGHT_FLAG);
            partials = holders = undefined2;
          }
          ary2 = ary2 === undefined2 ? ary2 : nativeMax(toInteger(ary2), 0);
          arity = arity === undefined2 ? arity : toInteger(arity);
          length -= holders ? holders.length : 0;
          if (bitmask & WRAP_PARTIAL_RIGHT_FLAG) {
            var partialsRight = partials, holdersRight = holders;
            partials = holders = undefined2;
          }
          var data = isBindKey ? undefined2 : getData(func);
          var newData = [
            func,
            bitmask,
            thisArg,
            partials,
            holders,
            partialsRight,
            holdersRight,
            argPos,
            ary2,
            arity
          ];
          if (data) {
            mergeData(newData, data);
          }
          func = newData[0];
          bitmask = newData[1];
          thisArg = newData[2];
          partials = newData[3];
          holders = newData[4];
          arity = newData[9] = newData[9] === undefined2 ? isBindKey ? 0 : func.length : nativeMax(newData[9] - length, 0);
          if (!arity && bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG)) {
            bitmask &= ~(WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG);
          }
          if (!bitmask || bitmask == WRAP_BIND_FLAG) {
            var result2 = createBind(func, bitmask, thisArg);
          } else if (bitmask == WRAP_CURRY_FLAG || bitmask == WRAP_CURRY_RIGHT_FLAG) {
            result2 = createCurry(func, bitmask, arity);
          } else if ((bitmask == WRAP_PARTIAL_FLAG || bitmask == (WRAP_BIND_FLAG | WRAP_PARTIAL_FLAG)) && !holders.length) {
            result2 = createPartial(func, bitmask, thisArg, partials);
          } else {
            result2 = createHybrid.apply(undefined2, newData);
          }
          var setter = data ? baseSetData : setData;
          return setWrapToString(setter(result2, newData), func, bitmask);
        }
        function customDefaultsAssignIn(objValue, srcValue, key, object) {
          if (objValue === undefined2 || eq(objValue, objectProto[key]) && !hasOwnProperty.call(object, key)) {
            return srcValue;
          }
          return objValue;
        }
        function customDefaultsMerge(objValue, srcValue, key, object, source, stack) {
          if (isObject(objValue) && isObject(srcValue)) {
            stack.set(srcValue, objValue);
            baseMerge(objValue, srcValue, undefined2, customDefaultsMerge, stack);
            stack["delete"](srcValue);
          }
          return objValue;
        }
        function customOmitClone(value) {
          return isPlainObject(value) ? undefined2 : value;
        }
        function equalArrays(array, other, bitmask, customizer, equalFunc, stack) {
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array.length, othLength = other.length;
          if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
            return false;
          }
          var arrStacked = stack.get(array);
          var othStacked = stack.get(other);
          if (arrStacked && othStacked) {
            return arrStacked == other && othStacked == array;
          }
          var index = -1, result2 = true, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache() : undefined2;
          stack.set(array, other);
          stack.set(other, array);
          while (++index < arrLength) {
            var arrValue = array[index], othValue = other[index];
            if (customizer) {
              var compared = isPartial ? customizer(othValue, arrValue, index, other, array, stack) : customizer(arrValue, othValue, index, array, other, stack);
            }
            if (compared !== undefined2) {
              if (compared) {
                continue;
              }
              result2 = false;
              break;
            }
            if (seen) {
              if (!arraySome(other, function(othValue2, othIndex) {
                if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
                  return seen.push(othIndex);
                }
              })) {
                result2 = false;
                break;
              }
            } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              result2 = false;
              break;
            }
          }
          stack["delete"](array);
          stack["delete"](other);
          return result2;
        }
        function equalByTag(object, other, tag, bitmask, customizer, equalFunc, stack) {
          switch (tag) {
            case dataViewTag:
              if (object.byteLength != other.byteLength || object.byteOffset != other.byteOffset) {
                return false;
              }
              object = object.buffer;
              other = other.buffer;
            case arrayBufferTag:
              if (object.byteLength != other.byteLength || !equalFunc(new Uint8Array2(object), new Uint8Array2(other))) {
                return false;
              }
              return true;
            case boolTag:
            case dateTag:
            case numberTag:
              return eq(+object, +other);
            case errorTag:
              return object.name == other.name && object.message == other.message;
            case regexpTag:
            case stringTag:
              return object == other + "";
            case mapTag:
              var convert = mapToArray;
            case setTag:
              var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
              convert || (convert = setToArray);
              if (object.size != other.size && !isPartial) {
                return false;
              }
              var stacked = stack.get(object);
              if (stacked) {
                return stacked == other;
              }
              bitmask |= COMPARE_UNORDERED_FLAG;
              stack.set(object, other);
              var result2 = equalArrays(convert(object), convert(other), bitmask, customizer, equalFunc, stack);
              stack["delete"](object);
              return result2;
            case symbolTag:
              if (symbolValueOf) {
                return symbolValueOf.call(object) == symbolValueOf.call(other);
              }
          }
          return false;
        }
        function equalObjects(object, other, bitmask, customizer, equalFunc, stack) {
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG, objProps = getAllKeys(object), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
          if (objLength != othLength && !isPartial) {
            return false;
          }
          var index = objLength;
          while (index--) {
            var key = objProps[index];
            if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
              return false;
            }
          }
          var objStacked = stack.get(object);
          var othStacked = stack.get(other);
          if (objStacked && othStacked) {
            return objStacked == other && othStacked == object;
          }
          var result2 = true;
          stack.set(object, other);
          stack.set(other, object);
          var skipCtor = isPartial;
          while (++index < objLength) {
            key = objProps[index];
            var objValue = object[key], othValue = other[key];
            if (customizer) {
              var compared = isPartial ? customizer(othValue, objValue, key, other, object, stack) : customizer(objValue, othValue, key, object, other, stack);
            }
            if (!(compared === undefined2 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
              result2 = false;
              break;
            }
            skipCtor || (skipCtor = key == "constructor");
          }
          if (result2 && !skipCtor) {
            var objCtor = object.constructor, othCtor = other.constructor;
            if (objCtor != othCtor && ("constructor" in object && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
              result2 = false;
            }
          }
          stack["delete"](object);
          stack["delete"](other);
          return result2;
        }
        function flatRest(func) {
          return setToString(overRest(func, undefined2, flatten), func + "");
        }
        function getAllKeys(object) {
          return baseGetAllKeys(object, keys, getSymbols);
        }
        function getAllKeysIn(object) {
          return baseGetAllKeys(object, keysIn, getSymbolsIn);
        }
        var getData = !metaMap ? noop : function(func) {
          return metaMap.get(func);
        };
        function getFuncName(func) {
          var result2 = func.name + "", array = realNames[result2], length = hasOwnProperty.call(realNames, result2) ? array.length : 0;
          while (length--) {
            var data = array[length], otherFunc = data.func;
            if (otherFunc == null || otherFunc == func) {
              return data.name;
            }
          }
          return result2;
        }
        function getHolder(func) {
          var object = hasOwnProperty.call(lodash, "placeholder") ? lodash : func;
          return object.placeholder;
        }
        function getIteratee() {
          var result2 = lodash.iteratee || iteratee;
          result2 = result2 === iteratee ? baseIteratee : result2;
          return arguments.length ? result2(arguments[0], arguments[1]) : result2;
        }
        function getMapData(map2, key) {
          var data = map2.__data__;
          return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
        }
        function getMatchData(object) {
          var result2 = keys(object), length = result2.length;
          while (length--) {
            var key = result2[length], value = object[key];
            result2[length] = [key, value, isStrictComparable(value)];
          }
          return result2;
        }
        function getNative(object, key) {
          var value = getValue(object, key);
          return baseIsNative(value) ? value : undefined2;
        }
        function getRawTag(value) {
          var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
          try {
            value[symToStringTag] = undefined2;
            var unmasked = true;
          } catch (e) {
          }
          var result2 = nativeObjectToString.call(value);
          if (unmasked) {
            if (isOwn) {
              value[symToStringTag] = tag;
            } else {
              delete value[symToStringTag];
            }
          }
          return result2;
        }
        var getSymbols = !nativeGetSymbols ? stubArray : function(object) {
          if (object == null) {
            return [];
          }
          object = Object2(object);
          return arrayFilter(nativeGetSymbols(object), function(symbol) {
            return propertyIsEnumerable.call(object, symbol);
          });
        };
        var getSymbolsIn = !nativeGetSymbols ? stubArray : function(object) {
          var result2 = [];
          while (object) {
            arrayPush(result2, getSymbols(object));
            object = getPrototype(object);
          }
          return result2;
        };
        var getTag = baseGetTag;
        if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map2 && getTag(new Map2()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set2 && getTag(new Set2()) != setTag || WeakMap && getTag(new WeakMap()) != weakMapTag) {
          getTag = function(value) {
            var result2 = baseGetTag(value), Ctor = result2 == objectTag ? value.constructor : undefined2, ctorString = Ctor ? toSource(Ctor) : "";
            if (ctorString) {
              switch (ctorString) {
                case dataViewCtorString:
                  return dataViewTag;
                case mapCtorString:
                  return mapTag;
                case promiseCtorString:
                  return promiseTag;
                case setCtorString:
                  return setTag;
                case weakMapCtorString:
                  return weakMapTag;
              }
            }
            return result2;
          };
        }
        function getView(start, end, transforms) {
          var index = -1, length = transforms.length;
          while (++index < length) {
            var data = transforms[index], size2 = data.size;
            switch (data.type) {
              case "drop":
                start += size2;
                break;
              case "dropRight":
                end -= size2;
                break;
              case "take":
                end = nativeMin(end, start + size2);
                break;
              case "takeRight":
                start = nativeMax(start, end - size2);
                break;
            }
          }
          return { "start": start, "end": end };
        }
        function getWrapDetails(source) {
          var match = source.match(reWrapDetails);
          return match ? match[1].split(reSplitDetails) : [];
        }
        function hasPath(object, path, hasFunc) {
          path = castPath(path, object);
          var index = -1, length = path.length, result2 = false;
          while (++index < length) {
            var key = toKey(path[index]);
            if (!(result2 = object != null && hasFunc(object, key))) {
              break;
            }
            object = object[key];
          }
          if (result2 || ++index != length) {
            return result2;
          }
          length = object == null ? 0 : object.length;
          return !!length && isLength(length) && isIndex(key, length) && (isArray(object) || isArguments(object));
        }
        function initCloneArray(array) {
          var length = array.length, result2 = new array.constructor(length);
          if (length && typeof array[0] == "string" && hasOwnProperty.call(array, "index")) {
            result2.index = array.index;
            result2.input = array.input;
          }
          return result2;
        }
        function initCloneObject(object) {
          return typeof object.constructor == "function" && !isPrototype(object) ? baseCreate(getPrototype(object)) : {};
        }
        function initCloneByTag(object, tag, isDeep) {
          var Ctor = object.constructor;
          switch (tag) {
            case arrayBufferTag:
              return cloneArrayBuffer(object);
            case boolTag:
            case dateTag:
              return new Ctor(+object);
            case dataViewTag:
              return cloneDataView(object, isDeep);
            case float32Tag:
            case float64Tag:
            case int8Tag:
            case int16Tag:
            case int32Tag:
            case uint8Tag:
            case uint8ClampedTag:
            case uint16Tag:
            case uint32Tag:
              return cloneTypedArray(object, isDeep);
            case mapTag:
              return new Ctor();
            case numberTag:
            case stringTag:
              return new Ctor(object);
            case regexpTag:
              return cloneRegExp(object);
            case setTag:
              return new Ctor();
            case symbolTag:
              return cloneSymbol(object);
          }
        }
        function insertWrapDetails(source, details) {
          var length = details.length;
          if (!length) {
            return source;
          }
          var lastIndex = length - 1;
          details[lastIndex] = (length > 1 ? "& " : "") + details[lastIndex];
          details = details.join(length > 2 ? ", " : " ");
          return source.replace(reWrapComment, "{\n/* [wrapped with " + details + "] */\n");
        }
        function isFlattenable(value) {
          return isArray(value) || isArguments(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
        }
        function isIndex(value, length) {
          var type = typeof value;
          length = length == null ? MAX_SAFE_INTEGER : length;
          return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
        }
        function isIterateeCall(value, index, object) {
          if (!isObject(object)) {
            return false;
          }
          var type = typeof index;
          if (type == "number" ? isArrayLike(object) && isIndex(index, object.length) : type == "string" && index in object) {
            return eq(object[index], value);
          }
          return false;
        }
        function isKey(value, object) {
          if (isArray(value)) {
            return false;
          }
          var type = typeof value;
          if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
            return true;
          }
          return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object2(object);
        }
        function isKeyable(value) {
          var type = typeof value;
          return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
        }
        function isLaziable(func) {
          var funcName = getFuncName(func), other = lodash[funcName];
          if (typeof other != "function" || !(funcName in LazyWrapper.prototype)) {
            return false;
          }
          if (func === other) {
            return true;
          }
          var data = getData(other);
          return !!data && func === data[0];
        }
        function isMasked(func) {
          return !!maskSrcKey && maskSrcKey in func;
        }
        var isMaskable = coreJsData ? isFunction : stubFalse;
        function isPrototype(value) {
          var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
          return value === proto;
        }
        function isStrictComparable(value) {
          return value === value && !isObject(value);
        }
        function matchesStrictComparable(key, srcValue) {
          return function(object) {
            if (object == null) {
              return false;
            }
            return object[key] === srcValue && (srcValue !== undefined2 || key in Object2(object));
          };
        }
        function memoizeCapped(func) {
          var result2 = memoize(func, function(key) {
            if (cache.size === MAX_MEMOIZE_SIZE) {
              cache.clear();
            }
            return key;
          });
          var cache = result2.cache;
          return result2;
        }
        function mergeData(data, source) {
          var bitmask = data[1], srcBitmask = source[1], newBitmask = bitmask | srcBitmask, isCommon = newBitmask < (WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG | WRAP_ARY_FLAG);
          var isCombo = srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_CURRY_FLAG || srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_REARG_FLAG && data[7].length <= source[8] || srcBitmask == (WRAP_ARY_FLAG | WRAP_REARG_FLAG) && source[7].length <= source[8] && bitmask == WRAP_CURRY_FLAG;
          if (!(isCommon || isCombo)) {
            return data;
          }
          if (srcBitmask & WRAP_BIND_FLAG) {
            data[2] = source[2];
            newBitmask |= bitmask & WRAP_BIND_FLAG ? 0 : WRAP_CURRY_BOUND_FLAG;
          }
          var value = source[3];
          if (value) {
            var partials = data[3];
            data[3] = partials ? composeArgs(partials, value, source[4]) : value;
            data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : source[4];
          }
          value = source[5];
          if (value) {
            partials = data[5];
            data[5] = partials ? composeArgsRight(partials, value, source[6]) : value;
            data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : source[6];
          }
          value = source[7];
          if (value) {
            data[7] = value;
          }
          if (srcBitmask & WRAP_ARY_FLAG) {
            data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
          }
          if (data[9] == null) {
            data[9] = source[9];
          }
          data[0] = source[0];
          data[1] = newBitmask;
          return data;
        }
        function nativeKeysIn(object) {
          var result2 = [];
          if (object != null) {
            for (var key in Object2(object)) {
              result2.push(key);
            }
          }
          return result2;
        }
        function objectToString(value) {
          return nativeObjectToString.call(value);
        }
        function overRest(func, start, transform2) {
          start = nativeMax(start === undefined2 ? func.length - 1 : start, 0);
          return function() {
            var args = arguments, index = -1, length = nativeMax(args.length - start, 0), array = Array2(length);
            while (++index < length) {
              array[index] = args[start + index];
            }
            index = -1;
            var otherArgs = Array2(start + 1);
            while (++index < start) {
              otherArgs[index] = args[index];
            }
            otherArgs[start] = transform2(array);
            return apply(func, this, otherArgs);
          };
        }
        function parent(object, path) {
          return path.length < 2 ? object : baseGet(object, baseSlice(path, 0, -1));
        }
        function reorder(array, indexes) {
          var arrLength = array.length, length = nativeMin(indexes.length, arrLength), oldArray = copyArray(array);
          while (length--) {
            var index = indexes[length];
            array[length] = isIndex(index, arrLength) ? oldArray[index] : undefined2;
          }
          return array;
        }
        function safeGet(object, key) {
          if (key === "constructor" && typeof object[key] === "function") {
            return;
          }
          if (key == "__proto__") {
            return;
          }
          return object[key];
        }
        var setData = shortOut(baseSetData);
        var setTimeout2 = ctxSetTimeout || function(func, wait) {
          return root.setTimeout(func, wait);
        };
        var setToString = shortOut(baseSetToString);
        function setWrapToString(wrapper, reference, bitmask) {
          var source = reference + "";
          return setToString(wrapper, insertWrapDetails(source, updateWrapDetails(getWrapDetails(source), bitmask)));
        }
        function shortOut(func) {
          var count = 0, lastCalled = 0;
          return function() {
            var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
            lastCalled = stamp;
            if (remaining > 0) {
              if (++count >= HOT_COUNT) {
                return arguments[0];
              }
            } else {
              count = 0;
            }
            return func.apply(undefined2, arguments);
          };
        }
        function shuffleSelf(array, size2) {
          var index = -1, length = array.length, lastIndex = length - 1;
          size2 = size2 === undefined2 ? length : size2;
          while (++index < size2) {
            var rand = baseRandom(index, lastIndex), value = array[rand];
            array[rand] = array[index];
            array[index] = value;
          }
          array.length = size2;
          return array;
        }
        var stringToPath = memoizeCapped(function(string) {
          var result2 = [];
          if (string.charCodeAt(0) === 46) {
            result2.push("");
          }
          string.replace(rePropName, function(match, number, quote, subString) {
            result2.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
          });
          return result2;
        });
        function toKey(value) {
          if (typeof value == "string" || isSymbol(value)) {
            return value;
          }
          var result2 = value + "";
          return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
        }
        function toSource(func) {
          if (func != null) {
            try {
              return funcToString.call(func);
            } catch (e) {
            }
            try {
              return func + "";
            } catch (e) {
            }
          }
          return "";
        }
        function updateWrapDetails(details, bitmask) {
          arrayEach(wrapFlags, function(pair) {
            var value = "_." + pair[0];
            if (bitmask & pair[1] && !arrayIncludes(details, value)) {
              details.push(value);
            }
          });
          return details.sort();
        }
        function wrapperClone(wrapper) {
          if (wrapper instanceof LazyWrapper) {
            return wrapper.clone();
          }
          var result2 = new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__);
          result2.__actions__ = copyArray(wrapper.__actions__);
          result2.__index__ = wrapper.__index__;
          result2.__values__ = wrapper.__values__;
          return result2;
        }
        function chunk(array, size2, guard) {
          if (guard ? isIterateeCall(array, size2, guard) : size2 === undefined2) {
            size2 = 1;
          } else {
            size2 = nativeMax(toInteger(size2), 0);
          }
          var length = array == null ? 0 : array.length;
          if (!length || size2 < 1) {
            return [];
          }
          var index = 0, resIndex = 0, result2 = Array2(nativeCeil(length / size2));
          while (index < length) {
            result2[resIndex++] = baseSlice(array, index, index += size2);
          }
          return result2;
        }
        function compact(array) {
          var index = -1, length = array == null ? 0 : array.length, resIndex = 0, result2 = [];
          while (++index < length) {
            var value = array[index];
            if (value) {
              result2[resIndex++] = value;
            }
          }
          return result2;
        }
        function concat() {
          var length = arguments.length;
          if (!length) {
            return [];
          }
          var args = Array2(length - 1), array = arguments[0], index = length;
          while (index--) {
            args[index - 1] = arguments[index];
          }
          return arrayPush(isArray(array) ? copyArray(array) : [array], baseFlatten(args, 1));
        }
        var difference = baseRest(function(array, values2) {
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true)) : [];
        });
        var differenceBy = baseRest(function(array, values2) {
          var iteratee2 = last(values2);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined2;
          }
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2)) : [];
        });
        var differenceWith = baseRest(function(array, values2) {
          var comparator = last(values2);
          if (isArrayLikeObject(comparator)) {
            comparator = undefined2;
          }
          return isArrayLikeObject(array) ? baseDifference(array, baseFlatten(values2, 1, isArrayLikeObject, true), undefined2, comparator) : [];
        });
        function drop(array, n, guard) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          return baseSlice(array, n < 0 ? 0 : n, length);
        }
        function dropRight(array, n, guard) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          n = length - n;
          return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function dropRightWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3), true, true) : [];
        }
        function dropWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3), true) : [];
        }
        function fill(array, value, start, end) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          if (start && typeof start != "number" && isIterateeCall(array, value, start)) {
            start = 0;
            end = length;
          }
          return baseFill(array, value, start, end);
        }
        function findIndex(array, predicate, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = fromIndex == null ? 0 : toInteger(fromIndex);
          if (index < 0) {
            index = nativeMax(length + index, 0);
          }
          return baseFindIndex(array, getIteratee(predicate, 3), index);
        }
        function findLastIndex(array, predicate, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = length - 1;
          if (fromIndex !== undefined2) {
            index = toInteger(fromIndex);
            index = fromIndex < 0 ? nativeMax(length + index, 0) : nativeMin(index, length - 1);
          }
          return baseFindIndex(array, getIteratee(predicate, 3), index, true);
        }
        function flatten(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseFlatten(array, 1) : [];
        }
        function flattenDeep(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseFlatten(array, INFINITY) : [];
        }
        function flattenDepth(array, depth) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          depth = depth === undefined2 ? 1 : toInteger(depth);
          return baseFlatten(array, depth);
        }
        function fromPairs(pairs) {
          var index = -1, length = pairs == null ? 0 : pairs.length, result2 = {};
          while (++index < length) {
            var pair = pairs[index];
            result2[pair[0]] = pair[1];
          }
          return result2;
        }
        function head(array) {
          return array && array.length ? array[0] : undefined2;
        }
        function indexOf(array, value, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = fromIndex == null ? 0 : toInteger(fromIndex);
          if (index < 0) {
            index = nativeMax(length + index, 0);
          }
          return baseIndexOf(array, value, index);
        }
        function initial(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseSlice(array, 0, -1) : [];
        }
        var intersection = baseRest(function(arrays) {
          var mapped = arrayMap(arrays, castArrayLikeObject);
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped) : [];
        });
        var intersectionBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays), mapped = arrayMap(arrays, castArrayLikeObject);
          if (iteratee2 === last(mapped)) {
            iteratee2 = undefined2;
          } else {
            mapped.pop();
          }
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped, getIteratee(iteratee2, 2)) : [];
        });
        var intersectionWith = baseRest(function(arrays) {
          var comparator = last(arrays), mapped = arrayMap(arrays, castArrayLikeObject);
          comparator = typeof comparator == "function" ? comparator : undefined2;
          if (comparator) {
            mapped.pop();
          }
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped, undefined2, comparator) : [];
        });
        function join(array, separator) {
          return array == null ? "" : nativeJoin.call(array, separator);
        }
        function last(array) {
          var length = array == null ? 0 : array.length;
          return length ? array[length - 1] : undefined2;
        }
        function lastIndexOf(array, value, fromIndex) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return -1;
          }
          var index = length;
          if (fromIndex !== undefined2) {
            index = toInteger(fromIndex);
            index = index < 0 ? nativeMax(length + index, 0) : nativeMin(index, length - 1);
          }
          return value === value ? strictLastIndexOf(array, value, index) : baseFindIndex(array, baseIsNaN, index, true);
        }
        function nth(array, n) {
          return array && array.length ? baseNth(array, toInteger(n)) : undefined2;
        }
        var pull = baseRest(pullAll);
        function pullAll(array, values2) {
          return array && array.length && values2 && values2.length ? basePullAll(array, values2) : array;
        }
        function pullAllBy(array, values2, iteratee2) {
          return array && array.length && values2 && values2.length ? basePullAll(array, values2, getIteratee(iteratee2, 2)) : array;
        }
        function pullAllWith(array, values2, comparator) {
          return array && array.length && values2 && values2.length ? basePullAll(array, values2, undefined2, comparator) : array;
        }
        var pullAt = flatRest(function(array, indexes) {
          var length = array == null ? 0 : array.length, result2 = baseAt(array, indexes);
          basePullAt(array, arrayMap(indexes, function(index) {
            return isIndex(index, length) ? +index : index;
          }).sort(compareAscending));
          return result2;
        });
        function remove(array, predicate) {
          var result2 = [];
          if (!(array && array.length)) {
            return result2;
          }
          var index = -1, indexes = [], length = array.length;
          predicate = getIteratee(predicate, 3);
          while (++index < length) {
            var value = array[index];
            if (predicate(value, index, array)) {
              result2.push(value);
              indexes.push(index);
            }
          }
          basePullAt(array, indexes);
          return result2;
        }
        function reverse(array) {
          return array == null ? array : nativeReverse.call(array);
        }
        function slice(array, start, end) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          if (end && typeof end != "number" && isIterateeCall(array, start, end)) {
            start = 0;
            end = length;
          } else {
            start = start == null ? 0 : toInteger(start);
            end = end === undefined2 ? length : toInteger(end);
          }
          return baseSlice(array, start, end);
        }
        function sortedIndex(array, value) {
          return baseSortedIndex(array, value);
        }
        function sortedIndexBy(array, value, iteratee2) {
          return baseSortedIndexBy(array, value, getIteratee(iteratee2, 2));
        }
        function sortedIndexOf(array, value) {
          var length = array == null ? 0 : array.length;
          if (length) {
            var index = baseSortedIndex(array, value);
            if (index < length && eq(array[index], value)) {
              return index;
            }
          }
          return -1;
        }
        function sortedLastIndex(array, value) {
          return baseSortedIndex(array, value, true);
        }
        function sortedLastIndexBy(array, value, iteratee2) {
          return baseSortedIndexBy(array, value, getIteratee(iteratee2, 2), true);
        }
        function sortedLastIndexOf(array, value) {
          var length = array == null ? 0 : array.length;
          if (length) {
            var index = baseSortedIndex(array, value, true) - 1;
            if (eq(array[index], value)) {
              return index;
            }
          }
          return -1;
        }
        function sortedUniq(array) {
          return array && array.length ? baseSortedUniq(array) : [];
        }
        function sortedUniqBy(array, iteratee2) {
          return array && array.length ? baseSortedUniq(array, getIteratee(iteratee2, 2)) : [];
        }
        function tail(array) {
          var length = array == null ? 0 : array.length;
          return length ? baseSlice(array, 1, length) : [];
        }
        function take(array, n, guard) {
          if (!(array && array.length)) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          return baseSlice(array, 0, n < 0 ? 0 : n);
        }
        function takeRight(array, n, guard) {
          var length = array == null ? 0 : array.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined2 ? 1 : toInteger(n);
          n = length - n;
          return baseSlice(array, n < 0 ? 0 : n, length);
        }
        function takeRightWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3), false, true) : [];
        }
        function takeWhile(array, predicate) {
          return array && array.length ? baseWhile(array, getIteratee(predicate, 3)) : [];
        }
        var union = baseRest(function(arrays) {
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true));
        });
        var unionBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined2;
          }
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2));
        });
        var unionWith = baseRest(function(arrays) {
          var comparator = last(arrays);
          comparator = typeof comparator == "function" ? comparator : undefined2;
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), undefined2, comparator);
        });
        function uniq(array) {
          return array && array.length ? baseUniq(array) : [];
        }
        function uniqBy(array, iteratee2) {
          return array && array.length ? baseUniq(array, getIteratee(iteratee2, 2)) : [];
        }
        function uniqWith(array, comparator) {
          comparator = typeof comparator == "function" ? comparator : undefined2;
          return array && array.length ? baseUniq(array, undefined2, comparator) : [];
        }
        function unzip(array) {
          if (!(array && array.length)) {
            return [];
          }
          var length = 0;
          array = arrayFilter(array, function(group) {
            if (isArrayLikeObject(group)) {
              length = nativeMax(group.length, length);
              return true;
            }
          });
          return baseTimes(length, function(index) {
            return arrayMap(array, baseProperty(index));
          });
        }
        function unzipWith(array, iteratee2) {
          if (!(array && array.length)) {
            return [];
          }
          var result2 = unzip(array);
          if (iteratee2 == null) {
            return result2;
          }
          return arrayMap(result2, function(group) {
            return apply(iteratee2, undefined2, group);
          });
        }
        var without = baseRest(function(array, values2) {
          return isArrayLikeObject(array) ? baseDifference(array, values2) : [];
        });
        var xor = baseRest(function(arrays) {
          return baseXor(arrayFilter(arrays, isArrayLikeObject));
        });
        var xorBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined2;
          }
          return baseXor(arrayFilter(arrays, isArrayLikeObject), getIteratee(iteratee2, 2));
        });
        var xorWith = baseRest(function(arrays) {
          var comparator = last(arrays);
          comparator = typeof comparator == "function" ? comparator : undefined2;
          return baseXor(arrayFilter(arrays, isArrayLikeObject), undefined2, comparator);
        });
        var zip = baseRest(unzip);
        function zipObject(props, values2) {
          return baseZipObject(props || [], values2 || [], assignValue);
        }
        function zipObjectDeep(props, values2) {
          return baseZipObject(props || [], values2 || [], baseSet);
        }
        var zipWith = baseRest(function(arrays) {
          var length = arrays.length, iteratee2 = length > 1 ? arrays[length - 1] : undefined2;
          iteratee2 = typeof iteratee2 == "function" ? (arrays.pop(), iteratee2) : undefined2;
          return unzipWith(arrays, iteratee2);
        });
        function chain(value) {
          var result2 = lodash(value);
          result2.__chain__ = true;
          return result2;
        }
        function tap(value, interceptor) {
          interceptor(value);
          return value;
        }
        function thru(value, interceptor) {
          return interceptor(value);
        }
        var wrapperAt = flatRest(function(paths) {
          var length = paths.length, start = length ? paths[0] : 0, value = this.__wrapped__, interceptor = function(object) {
            return baseAt(object, paths);
          };
          if (length > 1 || this.__actions__.length || !(value instanceof LazyWrapper) || !isIndex(start)) {
            return this.thru(interceptor);
          }
          value = value.slice(start, +start + (length ? 1 : 0));
          value.__actions__.push({
            "func": thru,
            "args": [interceptor],
            "thisArg": undefined2
          });
          return new LodashWrapper(value, this.__chain__).thru(function(array) {
            if (length && !array.length) {
              array.push(undefined2);
            }
            return array;
          });
        });
        function wrapperChain() {
          return chain(this);
        }
        function wrapperCommit() {
          return new LodashWrapper(this.value(), this.__chain__);
        }
        function wrapperNext() {
          if (this.__values__ === undefined2) {
            this.__values__ = toArray(this.value());
          }
          var done = this.__index__ >= this.__values__.length, value = done ? undefined2 : this.__values__[this.__index__++];
          return { "done": done, "value": value };
        }
        function wrapperToIterator() {
          return this;
        }
        function wrapperPlant(value) {
          var result2, parent2 = this;
          while (parent2 instanceof baseLodash) {
            var clone2 = wrapperClone(parent2);
            clone2.__index__ = 0;
            clone2.__values__ = undefined2;
            if (result2) {
              previous.__wrapped__ = clone2;
            } else {
              result2 = clone2;
            }
            var previous = clone2;
            parent2 = parent2.__wrapped__;
          }
          previous.__wrapped__ = value;
          return result2;
        }
        function wrapperReverse() {
          var value = this.__wrapped__;
          if (value instanceof LazyWrapper) {
            var wrapped = value;
            if (this.__actions__.length) {
              wrapped = new LazyWrapper(this);
            }
            wrapped = wrapped.reverse();
            wrapped.__actions__.push({
              "func": thru,
              "args": [reverse],
              "thisArg": undefined2
            });
            return new LodashWrapper(wrapped, this.__chain__);
          }
          return this.thru(reverse);
        }
        function wrapperValue() {
          return baseWrapperValue(this.__wrapped__, this.__actions__);
        }
        var countBy = createAggregator(function(result2, value, key) {
          if (hasOwnProperty.call(result2, key)) {
            ++result2[key];
          } else {
            baseAssignValue(result2, key, 1);
          }
        });
        function every(collection, predicate, guard) {
          var func = isArray(collection) ? arrayEvery : baseEvery;
          if (guard && isIterateeCall(collection, predicate, guard)) {
            predicate = undefined2;
          }
          return func(collection, getIteratee(predicate, 3));
        }
        function filter(collection, predicate) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          return func(collection, getIteratee(predicate, 3));
        }
        var find = createFind(findIndex);
        var findLast = createFind(findLastIndex);
        function flatMap(collection, iteratee2) {
          return baseFlatten(map(collection, iteratee2), 1);
        }
        function flatMapDeep(collection, iteratee2) {
          return baseFlatten(map(collection, iteratee2), INFINITY);
        }
        function flatMapDepth(collection, iteratee2, depth) {
          depth = depth === undefined2 ? 1 : toInteger(depth);
          return baseFlatten(map(collection, iteratee2), depth);
        }
        function forEach(collection, iteratee2) {
          var func = isArray(collection) ? arrayEach : baseEach;
          return func(collection, getIteratee(iteratee2, 3));
        }
        function forEachRight(collection, iteratee2) {
          var func = isArray(collection) ? arrayEachRight : baseEachRight;
          return func(collection, getIteratee(iteratee2, 3));
        }
        var groupBy = createAggregator(function(result2, value, key) {
          if (hasOwnProperty.call(result2, key)) {
            result2[key].push(value);
          } else {
            baseAssignValue(result2, key, [value]);
          }
        });
        function includes(collection, value, fromIndex, guard) {
          collection = isArrayLike(collection) ? collection : values(collection);
          fromIndex = fromIndex && !guard ? toInteger(fromIndex) : 0;
          var length = collection.length;
          if (fromIndex < 0) {
            fromIndex = nativeMax(length + fromIndex, 0);
          }
          return isString(collection) ? fromIndex <= length && collection.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection, value, fromIndex) > -1;
        }
        var invokeMap = baseRest(function(collection, path, args) {
          var index = -1, isFunc = typeof path == "function", result2 = isArrayLike(collection) ? Array2(collection.length) : [];
          baseEach(collection, function(value) {
            result2[++index] = isFunc ? apply(path, value, args) : baseInvoke(value, path, args);
          });
          return result2;
        });
        var keyBy = createAggregator(function(result2, value, key) {
          baseAssignValue(result2, key, value);
        });
        function map(collection, iteratee2) {
          var func = isArray(collection) ? arrayMap : baseMap;
          return func(collection, getIteratee(iteratee2, 3));
        }
        function orderBy(collection, iteratees, orders, guard) {
          if (collection == null) {
            return [];
          }
          if (!isArray(iteratees)) {
            iteratees = iteratees == null ? [] : [iteratees];
          }
          orders = guard ? undefined2 : orders;
          if (!isArray(orders)) {
            orders = orders == null ? [] : [orders];
          }
          return baseOrderBy(collection, iteratees, orders);
        }
        var partition = createAggregator(function(result2, value, key) {
          result2[key ? 0 : 1].push(value);
        }, function() {
          return [[], []];
        });
        function reduce(collection, iteratee2, accumulator) {
          var func = isArray(collection) ? arrayReduce : baseReduce, initAccum = arguments.length < 3;
          return func(collection, getIteratee(iteratee2, 4), accumulator, initAccum, baseEach);
        }
        function reduceRight(collection, iteratee2, accumulator) {
          var func = isArray(collection) ? arrayReduceRight : baseReduce, initAccum = arguments.length < 3;
          return func(collection, getIteratee(iteratee2, 4), accumulator, initAccum, baseEachRight);
        }
        function reject(collection, predicate) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          return func(collection, negate(getIteratee(predicate, 3)));
        }
        function sample(collection) {
          var func = isArray(collection) ? arraySample : baseSample;
          return func(collection);
        }
        function sampleSize(collection, n, guard) {
          if (guard ? isIterateeCall(collection, n, guard) : n === undefined2) {
            n = 1;
          } else {
            n = toInteger(n);
          }
          var func = isArray(collection) ? arraySampleSize : baseSampleSize;
          return func(collection, n);
        }
        function shuffle(collection) {
          var func = isArray(collection) ? arrayShuffle : baseShuffle;
          return func(collection);
        }
        function size(collection) {
          if (collection == null) {
            return 0;
          }
          if (isArrayLike(collection)) {
            return isString(collection) ? stringSize(collection) : collection.length;
          }
          var tag = getTag(collection);
          if (tag == mapTag || tag == setTag) {
            return collection.size;
          }
          return baseKeys(collection).length;
        }
        function some(collection, predicate, guard) {
          var func = isArray(collection) ? arraySome : baseSome;
          if (guard && isIterateeCall(collection, predicate, guard)) {
            predicate = undefined2;
          }
          return func(collection, getIteratee(predicate, 3));
        }
        var sortBy = baseRest(function(collection, iteratees) {
          if (collection == null) {
            return [];
          }
          var length = iteratees.length;
          if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
            iteratees = [];
          } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
            iteratees = [iteratees[0]];
          }
          return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
        });
        var now = ctxNow || function() {
          return root.Date.now();
        };
        function after(n, func) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          n = toInteger(n);
          return function() {
            if (--n < 1) {
              return func.apply(this, arguments);
            }
          };
        }
        function ary(func, n, guard) {
          n = guard ? undefined2 : n;
          n = func && n == null ? func.length : n;
          return createWrap(func, WRAP_ARY_FLAG, undefined2, undefined2, undefined2, undefined2, n);
        }
        function before(n, func) {
          var result2;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          n = toInteger(n);
          return function() {
            if (--n > 0) {
              result2 = func.apply(this, arguments);
            }
            if (n <= 1) {
              func = undefined2;
            }
            return result2;
          };
        }
        var bind = baseRest(function(func, thisArg, partials) {
          var bitmask = WRAP_BIND_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, getHolder(bind));
            bitmask |= WRAP_PARTIAL_FLAG;
          }
          return createWrap(func, bitmask, thisArg, partials, holders);
        });
        var bindKey = baseRest(function(object, key, partials) {
          var bitmask = WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, getHolder(bindKey));
            bitmask |= WRAP_PARTIAL_FLAG;
          }
          return createWrap(key, bitmask, object, partials, holders);
        });
        function curry(func, arity, guard) {
          arity = guard ? undefined2 : arity;
          var result2 = createWrap(func, WRAP_CURRY_FLAG, undefined2, undefined2, undefined2, undefined2, undefined2, arity);
          result2.placeholder = curry.placeholder;
          return result2;
        }
        function curryRight(func, arity, guard) {
          arity = guard ? undefined2 : arity;
          var result2 = createWrap(func, WRAP_CURRY_RIGHT_FLAG, undefined2, undefined2, undefined2, undefined2, undefined2, arity);
          result2.placeholder = curryRight.placeholder;
          return result2;
        }
        function debounce(func, wait, options) {
          var lastArgs, lastThis, maxWait, result2, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          wait = toNumber(wait) || 0;
          if (isObject(options)) {
            leading = !!options.leading;
            maxing = "maxWait" in options;
            maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
            trailing = "trailing" in options ? !!options.trailing : trailing;
          }
          function invokeFunc(time) {
            var args = lastArgs, thisArg = lastThis;
            lastArgs = lastThis = undefined2;
            lastInvokeTime = time;
            result2 = func.apply(thisArg, args);
            return result2;
          }
          function leadingEdge(time) {
            lastInvokeTime = time;
            timerId = setTimeout2(timerExpired, wait);
            return leading ? invokeFunc(time) : result2;
          }
          function remainingWait(time) {
            var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
            return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
          }
          function shouldInvoke(time) {
            var timeSinceLastCall = time - lastCallTime, timeSinceLastInvoke = time - lastInvokeTime;
            return lastCallTime === undefined2 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
          }
          function timerExpired() {
            var time = now();
            if (shouldInvoke(time)) {
              return trailingEdge(time);
            }
            timerId = setTimeout2(timerExpired, remainingWait(time));
          }
          function trailingEdge(time) {
            timerId = undefined2;
            if (trailing && lastArgs) {
              return invokeFunc(time);
            }
            lastArgs = lastThis = undefined2;
            return result2;
          }
          function cancel() {
            if (timerId !== undefined2) {
              clearTimeout2(timerId);
            }
            lastInvokeTime = 0;
            lastArgs = lastCallTime = lastThis = timerId = undefined2;
          }
          function flush() {
            return timerId === undefined2 ? result2 : trailingEdge(now());
          }
          function debounced() {
            var time = now(), isInvoking = shouldInvoke(time);
            lastArgs = arguments;
            lastThis = this;
            lastCallTime = time;
            if (isInvoking) {
              if (timerId === undefined2) {
                return leadingEdge(lastCallTime);
              }
              if (maxing) {
                clearTimeout2(timerId);
                timerId = setTimeout2(timerExpired, wait);
                return invokeFunc(lastCallTime);
              }
            }
            if (timerId === undefined2) {
              timerId = setTimeout2(timerExpired, wait);
            }
            return result2;
          }
          debounced.cancel = cancel;
          debounced.flush = flush;
          return debounced;
        }
        var defer = baseRest(function(func, args) {
          return baseDelay(func, 1, args);
        });
        var delay = baseRest(function(func, wait, args) {
          return baseDelay(func, toNumber(wait) || 0, args);
        });
        function flip(func) {
          return createWrap(func, WRAP_FLIP_FLAG);
        }
        function memoize(func, resolver) {
          if (typeof func != "function" || resolver != null && typeof resolver != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          var memoized = function() {
            var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
            if (cache.has(key)) {
              return cache.get(key);
            }
            var result2 = func.apply(this, args);
            memoized.cache = cache.set(key, result2) || cache;
            return result2;
          };
          memoized.cache = new (memoize.Cache || MapCache)();
          return memoized;
        }
        memoize.Cache = MapCache;
        function negate(predicate) {
          if (typeof predicate != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          return function() {
            var args = arguments;
            switch (args.length) {
              case 0:
                return !predicate.call(this);
              case 1:
                return !predicate.call(this, args[0]);
              case 2:
                return !predicate.call(this, args[0], args[1]);
              case 3:
                return !predicate.call(this, args[0], args[1], args[2]);
            }
            return !predicate.apply(this, args);
          };
        }
        function once(func) {
          return before(2, func);
        }
        var overArgs = castRest(function(func, transforms) {
          transforms = transforms.length == 1 && isArray(transforms[0]) ? arrayMap(transforms[0], baseUnary(getIteratee())) : arrayMap(baseFlatten(transforms, 1), baseUnary(getIteratee()));
          var funcsLength = transforms.length;
          return baseRest(function(args) {
            var index = -1, length = nativeMin(args.length, funcsLength);
            while (++index < length) {
              args[index] = transforms[index].call(this, args[index]);
            }
            return apply(func, this, args);
          });
        });
        var partial = baseRest(function(func, partials) {
          var holders = replaceHolders(partials, getHolder(partial));
          return createWrap(func, WRAP_PARTIAL_FLAG, undefined2, partials, holders);
        });
        var partialRight = baseRest(function(func, partials) {
          var holders = replaceHolders(partials, getHolder(partialRight));
          return createWrap(func, WRAP_PARTIAL_RIGHT_FLAG, undefined2, partials, holders);
        });
        var rearg = flatRest(function(func, indexes) {
          return createWrap(func, WRAP_REARG_FLAG, undefined2, undefined2, undefined2, indexes);
        });
        function rest(func, start) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          start = start === undefined2 ? start : toInteger(start);
          return baseRest(func, start);
        }
        function spread(func, start) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          start = start == null ? 0 : nativeMax(toInteger(start), 0);
          return baseRest(function(args) {
            var array = args[start], otherArgs = castSlice(args, 0, start);
            if (array) {
              arrayPush(otherArgs, array);
            }
            return apply(func, this, otherArgs);
          });
        }
        function throttle(func, wait, options) {
          var leading = true, trailing = true;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          if (isObject(options)) {
            leading = "leading" in options ? !!options.leading : leading;
            trailing = "trailing" in options ? !!options.trailing : trailing;
          }
          return debounce(func, wait, {
            "leading": leading,
            "maxWait": wait,
            "trailing": trailing
          });
        }
        function unary(func) {
          return ary(func, 1);
        }
        function wrap(value, wrapper) {
          return partial(castFunction(wrapper), value);
        }
        function castArray() {
          if (!arguments.length) {
            return [];
          }
          var value = arguments[0];
          return isArray(value) ? value : [value];
        }
        function clone(value) {
          return baseClone(value, CLONE_SYMBOLS_FLAG);
        }
        function cloneWith(value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return baseClone(value, CLONE_SYMBOLS_FLAG, customizer);
        }
        function cloneDeep(value) {
          return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
        }
        function cloneDeepWith(value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return baseClone(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG, customizer);
        }
        function conformsTo(object, source) {
          return source == null || baseConformsTo(object, source, keys(source));
        }
        function eq(value, other) {
          return value === other || value !== value && other !== other;
        }
        var gt = createRelationalOperation(baseGt);
        var gte = createRelationalOperation(function(value, other) {
          return value >= other;
        });
        var isArguments = baseIsArguments(/* @__PURE__ */ function() {
          return arguments;
        }()) ? baseIsArguments : function(value) {
          return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
        };
        var isArray = Array2.isArray;
        var isArrayBuffer = nodeIsArrayBuffer ? baseUnary(nodeIsArrayBuffer) : baseIsArrayBuffer;
        function isArrayLike(value) {
          return value != null && isLength(value.length) && !isFunction(value);
        }
        function isArrayLikeObject(value) {
          return isObjectLike(value) && isArrayLike(value);
        }
        function isBoolean(value) {
          return value === true || value === false || isObjectLike(value) && baseGetTag(value) == boolTag;
        }
        var isBuffer = nativeIsBuffer || stubFalse;
        var isDate = nodeIsDate ? baseUnary(nodeIsDate) : baseIsDate;
        function isElement(value) {
          return isObjectLike(value) && value.nodeType === 1 && !isPlainObject(value);
        }
        function isEmpty(value) {
          if (value == null) {
            return true;
          }
          if (isArrayLike(value) && (isArray(value) || typeof value == "string" || typeof value.splice == "function" || isBuffer(value) || isTypedArray(value) || isArguments(value))) {
            return !value.length;
          }
          var tag = getTag(value);
          if (tag == mapTag || tag == setTag) {
            return !value.size;
          }
          if (isPrototype(value)) {
            return !baseKeys(value).length;
          }
          for (var key in value) {
            if (hasOwnProperty.call(value, key)) {
              return false;
            }
          }
          return true;
        }
        function isEqual(value, other) {
          return baseIsEqual(value, other);
        }
        function isEqualWith(value, other, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          var result2 = customizer ? customizer(value, other) : undefined2;
          return result2 === undefined2 ? baseIsEqual(value, other, undefined2, customizer) : !!result2;
        }
        function isError(value) {
          if (!isObjectLike(value)) {
            return false;
          }
          var tag = baseGetTag(value);
          return tag == errorTag || tag == domExcTag || typeof value.message == "string" && typeof value.name == "string" && !isPlainObject(value);
        }
        function isFinite2(value) {
          return typeof value == "number" && nativeIsFinite(value);
        }
        function isFunction(value) {
          if (!isObject(value)) {
            return false;
          }
          var tag = baseGetTag(value);
          return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
        }
        function isInteger(value) {
          return typeof value == "number" && value == toInteger(value);
        }
        function isLength(value) {
          return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
        }
        function isObject(value) {
          var type = typeof value;
          return value != null && (type == "object" || type == "function");
        }
        function isObjectLike(value) {
          return value != null && typeof value == "object";
        }
        var isMap = nodeIsMap ? baseUnary(nodeIsMap) : baseIsMap;
        function isMatch(object, source) {
          return object === source || baseIsMatch(object, source, getMatchData(source));
        }
        function isMatchWith(object, source, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return baseIsMatch(object, source, getMatchData(source), customizer);
        }
        function isNaN2(value) {
          return isNumber(value) && value != +value;
        }
        function isNative(value) {
          if (isMaskable(value)) {
            throw new Error2(CORE_ERROR_TEXT);
          }
          return baseIsNative(value);
        }
        function isNull(value) {
          return value === null;
        }
        function isNil(value) {
          return value == null;
        }
        function isNumber(value) {
          return typeof value == "number" || isObjectLike(value) && baseGetTag(value) == numberTag;
        }
        function isPlainObject(value) {
          if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
            return false;
          }
          var proto = getPrototype(value);
          if (proto === null) {
            return true;
          }
          var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
          return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
        }
        var isRegExp = nodeIsRegExp ? baseUnary(nodeIsRegExp) : baseIsRegExp;
        function isSafeInteger(value) {
          return isInteger(value) && value >= -MAX_SAFE_INTEGER && value <= MAX_SAFE_INTEGER;
        }
        var isSet = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;
        function isString(value) {
          return typeof value == "string" || !isArray(value) && isObjectLike(value) && baseGetTag(value) == stringTag;
        }
        function isSymbol(value) {
          return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
        }
        var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
        function isUndefined(value) {
          return value === undefined2;
        }
        function isWeakMap(value) {
          return isObjectLike(value) && getTag(value) == weakMapTag;
        }
        function isWeakSet(value) {
          return isObjectLike(value) && baseGetTag(value) == weakSetTag;
        }
        var lt = createRelationalOperation(baseLt);
        var lte = createRelationalOperation(function(value, other) {
          return value <= other;
        });
        function toArray(value) {
          if (!value) {
            return [];
          }
          if (isArrayLike(value)) {
            return isString(value) ? stringToArray(value) : copyArray(value);
          }
          if (symIterator && value[symIterator]) {
            return iteratorToArray(value[symIterator]());
          }
          var tag = getTag(value), func = tag == mapTag ? mapToArray : tag == setTag ? setToArray : values;
          return func(value);
        }
        function toFinite(value) {
          if (!value) {
            return value === 0 ? value : 0;
          }
          value = toNumber(value);
          if (value === INFINITY || value === -INFINITY) {
            var sign = value < 0 ? -1 : 1;
            return sign * MAX_INTEGER;
          }
          return value === value ? value : 0;
        }
        function toInteger(value) {
          var result2 = toFinite(value), remainder = result2 % 1;
          return result2 === result2 ? remainder ? result2 - remainder : result2 : 0;
        }
        function toLength(value) {
          return value ? baseClamp(toInteger(value), 0, MAX_ARRAY_LENGTH) : 0;
        }
        function toNumber(value) {
          if (typeof value == "number") {
            return value;
          }
          if (isSymbol(value)) {
            return NAN;
          }
          if (isObject(value)) {
            var other = typeof value.valueOf == "function" ? value.valueOf() : value;
            value = isObject(other) ? other + "" : other;
          }
          if (typeof value != "string") {
            return value === 0 ? value : +value;
          }
          value = baseTrim(value);
          var isBinary = reIsBinary.test(value);
          return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
        }
        function toPlainObject(value) {
          return copyObject(value, keysIn(value));
        }
        function toSafeInteger(value) {
          return value ? baseClamp(toInteger(value), -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER) : value === 0 ? value : 0;
        }
        function toString(value) {
          return value == null ? "" : baseToString(value);
        }
        var assign = createAssigner(function(object, source) {
          if (isPrototype(source) || isArrayLike(source)) {
            copyObject(source, keys(source), object);
            return;
          }
          for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
              assignValue(object, key, source[key]);
            }
          }
        });
        var assignIn = createAssigner(function(object, source) {
          copyObject(source, keysIn(source), object);
        });
        var assignInWith = createAssigner(function(object, source, srcIndex, customizer) {
          copyObject(source, keysIn(source), object, customizer);
        });
        var assignWith = createAssigner(function(object, source, srcIndex, customizer) {
          copyObject(source, keys(source), object, customizer);
        });
        var at = flatRest(baseAt);
        function create(prototype, properties) {
          var result2 = baseCreate(prototype);
          return properties == null ? result2 : baseAssign(result2, properties);
        }
        var defaults = baseRest(function(object, sources) {
          object = Object2(object);
          var index = -1;
          var length = sources.length;
          var guard = length > 2 ? sources[2] : undefined2;
          if (guard && isIterateeCall(sources[0], sources[1], guard)) {
            length = 1;
          }
          while (++index < length) {
            var source = sources[index];
            var props = keysIn(source);
            var propsIndex = -1;
            var propsLength = props.length;
            while (++propsIndex < propsLength) {
              var key = props[propsIndex];
              var value = object[key];
              if (value === undefined2 || eq(value, objectProto[key]) && !hasOwnProperty.call(object, key)) {
                object[key] = source[key];
              }
            }
          }
          return object;
        });
        var defaultsDeep = baseRest(function(args) {
          args.push(undefined2, customDefaultsMerge);
          return apply(mergeWith, undefined2, args);
        });
        function findKey(object, predicate) {
          return baseFindKey(object, getIteratee(predicate, 3), baseForOwn);
        }
        function findLastKey(object, predicate) {
          return baseFindKey(object, getIteratee(predicate, 3), baseForOwnRight);
        }
        function forIn(object, iteratee2) {
          return object == null ? object : baseFor(object, getIteratee(iteratee2, 3), keysIn);
        }
        function forInRight(object, iteratee2) {
          return object == null ? object : baseForRight(object, getIteratee(iteratee2, 3), keysIn);
        }
        function forOwn(object, iteratee2) {
          return object && baseForOwn(object, getIteratee(iteratee2, 3));
        }
        function forOwnRight(object, iteratee2) {
          return object && baseForOwnRight(object, getIteratee(iteratee2, 3));
        }
        function functions(object) {
          return object == null ? [] : baseFunctions(object, keys(object));
        }
        function functionsIn(object) {
          return object == null ? [] : baseFunctions(object, keysIn(object));
        }
        function get(object, path, defaultValue) {
          var result2 = object == null ? undefined2 : baseGet(object, path);
          return result2 === undefined2 ? defaultValue : result2;
        }
        function has(object, path) {
          return object != null && hasPath(object, path, baseHas);
        }
        function hasIn(object, path) {
          return object != null && hasPath(object, path, baseHasIn);
        }
        var invert = createInverter(function(result2, value, key) {
          if (value != null && typeof value.toString != "function") {
            value = nativeObjectToString.call(value);
          }
          result2[value] = key;
        }, constant(identity));
        var invertBy = createInverter(function(result2, value, key) {
          if (value != null && typeof value.toString != "function") {
            value = nativeObjectToString.call(value);
          }
          if (hasOwnProperty.call(result2, value)) {
            result2[value].push(key);
          } else {
            result2[value] = [key];
          }
        }, getIteratee);
        var invoke = baseRest(baseInvoke);
        function keys(object) {
          return isArrayLike(object) ? arrayLikeKeys(object) : baseKeys(object);
        }
        function keysIn(object) {
          return isArrayLike(object) ? arrayLikeKeys(object, true) : baseKeysIn(object);
        }
        function mapKeys(object, iteratee2) {
          var result2 = {};
          iteratee2 = getIteratee(iteratee2, 3);
          baseForOwn(object, function(value, key, object2) {
            baseAssignValue(result2, iteratee2(value, key, object2), value);
          });
          return result2;
        }
        function mapValues(object, iteratee2) {
          var result2 = {};
          iteratee2 = getIteratee(iteratee2, 3);
          baseForOwn(object, function(value, key, object2) {
            baseAssignValue(result2, key, iteratee2(value, key, object2));
          });
          return result2;
        }
        var merge = createAssigner(function(object, source, srcIndex) {
          baseMerge(object, source, srcIndex);
        });
        var mergeWith = createAssigner(function(object, source, srcIndex, customizer) {
          baseMerge(object, source, srcIndex, customizer);
        });
        var omit = flatRest(function(object, paths) {
          var result2 = {};
          if (object == null) {
            return result2;
          }
          var isDeep = false;
          paths = arrayMap(paths, function(path) {
            path = castPath(path, object);
            isDeep || (isDeep = path.length > 1);
            return path;
          });
          copyObject(object, getAllKeysIn(object), result2);
          if (isDeep) {
            result2 = baseClone(result2, CLONE_DEEP_FLAG | CLONE_FLAT_FLAG | CLONE_SYMBOLS_FLAG, customOmitClone);
          }
          var length = paths.length;
          while (length--) {
            baseUnset(result2, paths[length]);
          }
          return result2;
        });
        function omitBy(object, predicate) {
          return pickBy(object, negate(getIteratee(predicate)));
        }
        var pick = flatRest(function(object, paths) {
          return object == null ? {} : basePick(object, paths);
        });
        function pickBy(object, predicate) {
          if (object == null) {
            return {};
          }
          var props = arrayMap(getAllKeysIn(object), function(prop) {
            return [prop];
          });
          predicate = getIteratee(predicate);
          return basePickBy(object, props, function(value, path) {
            return predicate(value, path[0]);
          });
        }
        function result(object, path, defaultValue) {
          path = castPath(path, object);
          var index = -1, length = path.length;
          if (!length) {
            length = 1;
            object = undefined2;
          }
          while (++index < length) {
            var value = object == null ? undefined2 : object[toKey(path[index])];
            if (value === undefined2) {
              index = length;
              value = defaultValue;
            }
            object = isFunction(value) ? value.call(object) : value;
          }
          return object;
        }
        function set(object, path, value) {
          return object == null ? object : baseSet(object, path, value);
        }
        function setWith(object, path, value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return object == null ? object : baseSet(object, path, value, customizer);
        }
        var toPairs = createToPairs(keys);
        var toPairsIn = createToPairs(keysIn);
        function transform(object, iteratee2, accumulator) {
          var isArr = isArray(object), isArrLike = isArr || isBuffer(object) || isTypedArray(object);
          iteratee2 = getIteratee(iteratee2, 4);
          if (accumulator == null) {
            var Ctor = object && object.constructor;
            if (isArrLike) {
              accumulator = isArr ? new Ctor() : [];
            } else if (isObject(object)) {
              accumulator = isFunction(Ctor) ? baseCreate(getPrototype(object)) : {};
            } else {
              accumulator = {};
            }
          }
          (isArrLike ? arrayEach : baseForOwn)(object, function(value, index, object2) {
            return iteratee2(accumulator, value, index, object2);
          });
          return accumulator;
        }
        function unset(object, path) {
          return object == null ? true : baseUnset(object, path);
        }
        function update(object, path, updater) {
          return object == null ? object : baseUpdate(object, path, castFunction(updater));
        }
        function updateWith(object, path, updater, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined2;
          return object == null ? object : baseUpdate(object, path, castFunction(updater), customizer);
        }
        function values(object) {
          return object == null ? [] : baseValues(object, keys(object));
        }
        function valuesIn(object) {
          return object == null ? [] : baseValues(object, keysIn(object));
        }
        function clamp(number, lower, upper) {
          if (upper === undefined2) {
            upper = lower;
            lower = undefined2;
          }
          if (upper !== undefined2) {
            upper = toNumber(upper);
            upper = upper === upper ? upper : 0;
          }
          if (lower !== undefined2) {
            lower = toNumber(lower);
            lower = lower === lower ? lower : 0;
          }
          return baseClamp(toNumber(number), lower, upper);
        }
        function inRange(number, start, end) {
          start = toFinite(start);
          if (end === undefined2) {
            end = start;
            start = 0;
          } else {
            end = toFinite(end);
          }
          number = toNumber(number);
          return baseInRange(number, start, end);
        }
        function random(lower, upper, floating) {
          if (floating && typeof floating != "boolean" && isIterateeCall(lower, upper, floating)) {
            upper = floating = undefined2;
          }
          if (floating === undefined2) {
            if (typeof upper == "boolean") {
              floating = upper;
              upper = undefined2;
            } else if (typeof lower == "boolean") {
              floating = lower;
              lower = undefined2;
            }
          }
          if (lower === undefined2 && upper === undefined2) {
            lower = 0;
            upper = 1;
          } else {
            lower = toFinite(lower);
            if (upper === undefined2) {
              upper = lower;
              lower = 0;
            } else {
              upper = toFinite(upper);
            }
          }
          if (lower > upper) {
            var temp = lower;
            lower = upper;
            upper = temp;
          }
          if (floating || lower % 1 || upper % 1) {
            var rand = nativeRandom();
            return nativeMin(lower + rand * (upper - lower + freeParseFloat("1e-" + ((rand + "").length - 1))), upper);
          }
          return baseRandom(lower, upper);
        }
        var camelCase = createCompounder(function(result2, word, index) {
          word = word.toLowerCase();
          return result2 + (index ? capitalize(word) : word);
        });
        function capitalize(string) {
          return upperFirst(toString(string).toLowerCase());
        }
        function deburr(string) {
          string = toString(string);
          return string && string.replace(reLatin, deburrLetter).replace(reComboMark, "");
        }
        function endsWith(string, target, position) {
          string = toString(string);
          target = baseToString(target);
          var length = string.length;
          position = position === undefined2 ? length : baseClamp(toInteger(position), 0, length);
          var end = position;
          position -= target.length;
          return position >= 0 && string.slice(position, end) == target;
        }
        function escape(string) {
          string = toString(string);
          return string && reHasUnescapedHtml.test(string) ? string.replace(reUnescapedHtml, escapeHtmlChar) : string;
        }
        function escapeRegExp(string) {
          string = toString(string);
          return string && reHasRegExpChar.test(string) ? string.replace(reRegExpChar, "\\$&") : string;
        }
        var kebabCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? "-" : "") + word.toLowerCase();
        });
        var lowerCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? " " : "") + word.toLowerCase();
        });
        var lowerFirst = createCaseFirst("toLowerCase");
        function pad(string, length, chars) {
          string = toString(string);
          length = toInteger(length);
          var strLength = length ? stringSize(string) : 0;
          if (!length || strLength >= length) {
            return string;
          }
          var mid = (length - strLength) / 2;
          return createPadding(nativeFloor(mid), chars) + string + createPadding(nativeCeil(mid), chars);
        }
        function padEnd(string, length, chars) {
          string = toString(string);
          length = toInteger(length);
          var strLength = length ? stringSize(string) : 0;
          return length && strLength < length ? string + createPadding(length - strLength, chars) : string;
        }
        function padStart(string, length, chars) {
          string = toString(string);
          length = toInteger(length);
          var strLength = length ? stringSize(string) : 0;
          return length && strLength < length ? createPadding(length - strLength, chars) + string : string;
        }
        function parseInt2(string, radix, guard) {
          if (guard || radix == null) {
            radix = 0;
          } else if (radix) {
            radix = +radix;
          }
          return nativeParseInt(toString(string).replace(reTrimStart, ""), radix || 0);
        }
        function repeat(string, n, guard) {
          if (guard ? isIterateeCall(string, n, guard) : n === undefined2) {
            n = 1;
          } else {
            n = toInteger(n);
          }
          return baseRepeat(toString(string), n);
        }
        function replace() {
          var args = arguments, string = toString(args[0]);
          return args.length < 3 ? string : string.replace(args[1], args[2]);
        }
        var snakeCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? "_" : "") + word.toLowerCase();
        });
        function split(string, separator, limit) {
          if (limit && typeof limit != "number" && isIterateeCall(string, separator, limit)) {
            separator = limit = undefined2;
          }
          limit = limit === undefined2 ? MAX_ARRAY_LENGTH : limit >>> 0;
          if (!limit) {
            return [];
          }
          string = toString(string);
          if (string && (typeof separator == "string" || separator != null && !isRegExp(separator))) {
            separator = baseToString(separator);
            if (!separator && hasUnicode(string)) {
              return castSlice(stringToArray(string), 0, limit);
            }
          }
          return string.split(separator, limit);
        }
        var startCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? " " : "") + upperFirst(word);
        });
        function startsWith(string, target, position) {
          string = toString(string);
          position = position == null ? 0 : baseClamp(toInteger(position), 0, string.length);
          target = baseToString(target);
          return string.slice(position, position + target.length) == target;
        }
        function template(string, options, guard) {
          var settings = lodash.templateSettings;
          if (guard && isIterateeCall(string, options, guard)) {
            options = undefined2;
          }
          string = toString(string);
          options = assignInWith({}, options, settings, customDefaultsAssignIn);
          var imports = assignInWith({}, options.imports, settings.imports, customDefaultsAssignIn), importsKeys = keys(imports), importsValues = baseValues(imports, importsKeys);
          var isEscaping, isEvaluating, index = 0, interpolate = options.interpolate || reNoMatch, source = "__p += '";
          var reDelimiters = RegExp2(
            (options.escape || reNoMatch).source + "|" + interpolate.source + "|" + (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + "|" + (options.evaluate || reNoMatch).source + "|$",
            "g"
          );
          var sourceURL = "//# sourceURL=" + (hasOwnProperty.call(options, "sourceURL") ? (options.sourceURL + "").replace(/\s/g, " ") : "lodash.templateSources[" + ++templateCounter + "]") + "\n";
          string.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
            interpolateValue || (interpolateValue = esTemplateValue);
            source += string.slice(index, offset).replace(reUnescapedString, escapeStringChar);
            if (escapeValue) {
              isEscaping = true;
              source += "' +\n__e(" + escapeValue + ") +\n'";
            }
            if (evaluateValue) {
              isEvaluating = true;
              source += "';\n" + evaluateValue + ";\n__p += '";
            }
            if (interpolateValue) {
              source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
            }
            index = offset + match.length;
            return match;
          });
          source += "';\n";
          var variable = hasOwnProperty.call(options, "variable") && options.variable;
          if (!variable) {
            source = "with (obj) {\n" + source + "\n}\n";
          } else if (reForbiddenIdentifierChars.test(variable)) {
            throw new Error2(INVALID_TEMPL_VAR_ERROR_TEXT);
          }
          source = (isEvaluating ? source.replace(reEmptyStringLeading, "") : source).replace(reEmptyStringMiddle, "$1").replace(reEmptyStringTrailing, "$1;");
          source = "function(" + (variable || "obj") + ") {\n" + (variable ? "" : "obj || (obj = {});\n") + "var __t, __p = ''" + (isEscaping ? ", __e = _.escape" : "") + (isEvaluating ? ", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n" : ";\n") + source + "return __p\n}";
          var result2 = attempt(function() {
            return Function2(importsKeys, sourceURL + "return " + source).apply(undefined2, importsValues);
          });
          result2.source = source;
          if (isError(result2)) {
            throw result2;
          }
          return result2;
        }
        function toLower(value) {
          return toString(value).toLowerCase();
        }
        function toUpper(value) {
          return toString(value).toUpperCase();
        }
        function trim(string, chars, guard) {
          string = toString(string);
          if (string && (guard || chars === undefined2)) {
            return baseTrim(string);
          }
          if (!string || !(chars = baseToString(chars))) {
            return string;
          }
          var strSymbols = stringToArray(string), chrSymbols = stringToArray(chars), start = charsStartIndex(strSymbols, chrSymbols), end = charsEndIndex(strSymbols, chrSymbols) + 1;
          return castSlice(strSymbols, start, end).join("");
        }
        function trimEnd(string, chars, guard) {
          string = toString(string);
          if (string && (guard || chars === undefined2)) {
            return string.slice(0, trimmedEndIndex(string) + 1);
          }
          if (!string || !(chars = baseToString(chars))) {
            return string;
          }
          var strSymbols = stringToArray(string), end = charsEndIndex(strSymbols, stringToArray(chars)) + 1;
          return castSlice(strSymbols, 0, end).join("");
        }
        function trimStart(string, chars, guard) {
          string = toString(string);
          if (string && (guard || chars === undefined2)) {
            return string.replace(reTrimStart, "");
          }
          if (!string || !(chars = baseToString(chars))) {
            return string;
          }
          var strSymbols = stringToArray(string), start = charsStartIndex(strSymbols, stringToArray(chars));
          return castSlice(strSymbols, start).join("");
        }
        function truncate(string, options) {
          var length = DEFAULT_TRUNC_LENGTH, omission = DEFAULT_TRUNC_OMISSION;
          if (isObject(options)) {
            var separator = "separator" in options ? options.separator : separator;
            length = "length" in options ? toInteger(options.length) : length;
            omission = "omission" in options ? baseToString(options.omission) : omission;
          }
          string = toString(string);
          var strLength = string.length;
          if (hasUnicode(string)) {
            var strSymbols = stringToArray(string);
            strLength = strSymbols.length;
          }
          if (length >= strLength) {
            return string;
          }
          var end = length - stringSize(omission);
          if (end < 1) {
            return omission;
          }
          var result2 = strSymbols ? castSlice(strSymbols, 0, end).join("") : string.slice(0, end);
          if (separator === undefined2) {
            return result2 + omission;
          }
          if (strSymbols) {
            end += result2.length - end;
          }
          if (isRegExp(separator)) {
            if (string.slice(end).search(separator)) {
              var match, substring = result2;
              if (!separator.global) {
                separator = RegExp2(separator.source, toString(reFlags.exec(separator)) + "g");
              }
              separator.lastIndex = 0;
              while (match = separator.exec(substring)) {
                var newEnd = match.index;
              }
              result2 = result2.slice(0, newEnd === undefined2 ? end : newEnd);
            }
          } else if (string.indexOf(baseToString(separator), end) != end) {
            var index = result2.lastIndexOf(separator);
            if (index > -1) {
              result2 = result2.slice(0, index);
            }
          }
          return result2 + omission;
        }
        function unescape(string) {
          string = toString(string);
          return string && reHasEscapedHtml.test(string) ? string.replace(reEscapedHtml, unescapeHtmlChar) : string;
        }
        var upperCase = createCompounder(function(result2, word, index) {
          return result2 + (index ? " " : "") + word.toUpperCase();
        });
        var upperFirst = createCaseFirst("toUpperCase");
        function words(string, pattern, guard) {
          string = toString(string);
          pattern = guard ? undefined2 : pattern;
          if (pattern === undefined2) {
            return hasUnicodeWord(string) ? unicodeWords(string) : asciiWords(string);
          }
          return string.match(pattern) || [];
        }
        var attempt = baseRest(function(func, args) {
          try {
            return apply(func, undefined2, args);
          } catch (e) {
            return isError(e) ? e : new Error2(e);
          }
        });
        var bindAll = flatRest(function(object, methodNames) {
          arrayEach(methodNames, function(key) {
            key = toKey(key);
            baseAssignValue(object, key, bind(object[key], object));
          });
          return object;
        });
        function cond(pairs) {
          var length = pairs == null ? 0 : pairs.length, toIteratee = getIteratee();
          pairs = !length ? [] : arrayMap(pairs, function(pair) {
            if (typeof pair[1] != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            return [toIteratee(pair[0]), pair[1]];
          });
          return baseRest(function(args) {
            var index = -1;
            while (++index < length) {
              var pair = pairs[index];
              if (apply(pair[0], this, args)) {
                return apply(pair[1], this, args);
              }
            }
          });
        }
        function conforms(source) {
          return baseConforms(baseClone(source, CLONE_DEEP_FLAG));
        }
        function constant(value) {
          return function() {
            return value;
          };
        }
        function defaultTo(value, defaultValue) {
          return value == null || value !== value ? defaultValue : value;
        }
        var flow = createFlow();
        var flowRight = createFlow(true);
        function identity(value) {
          return value;
        }
        function iteratee(func) {
          return baseIteratee(typeof func == "function" ? func : baseClone(func, CLONE_DEEP_FLAG));
        }
        function matches(source) {
          return baseMatches(baseClone(source, CLONE_DEEP_FLAG));
        }
        function matchesProperty(path, srcValue) {
          return baseMatchesProperty(path, baseClone(srcValue, CLONE_DEEP_FLAG));
        }
        var method = baseRest(function(path, args) {
          return function(object) {
            return baseInvoke(object, path, args);
          };
        });
        var methodOf = baseRest(function(object, args) {
          return function(path) {
            return baseInvoke(object, path, args);
          };
        });
        function mixin(object, source, options) {
          var props = keys(source), methodNames = baseFunctions(source, props);
          if (options == null && !(isObject(source) && (methodNames.length || !props.length))) {
            options = source;
            source = object;
            object = this;
            methodNames = baseFunctions(source, keys(source));
          }
          var chain2 = !(isObject(options) && "chain" in options) || !!options.chain, isFunc = isFunction(object);
          arrayEach(methodNames, function(methodName) {
            var func = source[methodName];
            object[methodName] = func;
            if (isFunc) {
              object.prototype[methodName] = function() {
                var chainAll = this.__chain__;
                if (chain2 || chainAll) {
                  var result2 = object(this.__wrapped__), actions = result2.__actions__ = copyArray(this.__actions__);
                  actions.push({ "func": func, "args": arguments, "thisArg": object });
                  result2.__chain__ = chainAll;
                  return result2;
                }
                return func.apply(object, arrayPush([this.value()], arguments));
              };
            }
          });
          return object;
        }
        function noConflict() {
          if (root._ === this) {
            root._ = oldDash;
          }
          return this;
        }
        function noop() {
        }
        function nthArg(n) {
          n = toInteger(n);
          return baseRest(function(args) {
            return baseNth(args, n);
          });
        }
        var over = createOver(arrayMap);
        var overEvery = createOver(arrayEvery);
        var overSome = createOver(arraySome);
        function property(path) {
          return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
        }
        function propertyOf(object) {
          return function(path) {
            return object == null ? undefined2 : baseGet(object, path);
          };
        }
        var range = createRange();
        var rangeRight = createRange(true);
        function stubArray() {
          return [];
        }
        function stubFalse() {
          return false;
        }
        function stubObject() {
          return {};
        }
        function stubString() {
          return "";
        }
        function stubTrue() {
          return true;
        }
        function times(n, iteratee2) {
          n = toInteger(n);
          if (n < 1 || n > MAX_SAFE_INTEGER) {
            return [];
          }
          var index = MAX_ARRAY_LENGTH, length = nativeMin(n, MAX_ARRAY_LENGTH);
          iteratee2 = getIteratee(iteratee2);
          n -= MAX_ARRAY_LENGTH;
          var result2 = baseTimes(length, iteratee2);
          while (++index < n) {
            iteratee2(index);
          }
          return result2;
        }
        function toPath(value) {
          if (isArray(value)) {
            return arrayMap(value, toKey);
          }
          return isSymbol(value) ? [value] : copyArray(stringToPath(toString(value)));
        }
        function uniqueId(prefix) {
          var id = ++idCounter;
          return toString(prefix) + id;
        }
        var add = createMathOperation(function(augend, addend) {
          return augend + addend;
        }, 0);
        var ceil = createRound("ceil");
        var divide = createMathOperation(function(dividend, divisor) {
          return dividend / divisor;
        }, 1);
        var floor = createRound("floor");
        function max(array) {
          return array && array.length ? baseExtremum(array, identity, baseGt) : undefined2;
        }
        function maxBy(array, iteratee2) {
          return array && array.length ? baseExtremum(array, getIteratee(iteratee2, 2), baseGt) : undefined2;
        }
        function mean(array) {
          return baseMean(array, identity);
        }
        function meanBy(array, iteratee2) {
          return baseMean(array, getIteratee(iteratee2, 2));
        }
        function min(array) {
          return array && array.length ? baseExtremum(array, identity, baseLt) : undefined2;
        }
        function minBy(array, iteratee2) {
          return array && array.length ? baseExtremum(array, getIteratee(iteratee2, 2), baseLt) : undefined2;
        }
        var multiply = createMathOperation(function(multiplier, multiplicand) {
          return multiplier * multiplicand;
        }, 1);
        var round = createRound("round");
        var subtract = createMathOperation(function(minuend, subtrahend) {
          return minuend - subtrahend;
        }, 0);
        function sum(array) {
          return array && array.length ? baseSum(array, identity) : 0;
        }
        function sumBy(array, iteratee2) {
          return array && array.length ? baseSum(array, getIteratee(iteratee2, 2)) : 0;
        }
        lodash.after = after;
        lodash.ary = ary;
        lodash.assign = assign;
        lodash.assignIn = assignIn;
        lodash.assignInWith = assignInWith;
        lodash.assignWith = assignWith;
        lodash.at = at;
        lodash.before = before;
        lodash.bind = bind;
        lodash.bindAll = bindAll;
        lodash.bindKey = bindKey;
        lodash.castArray = castArray;
        lodash.chain = chain;
        lodash.chunk = chunk;
        lodash.compact = compact;
        lodash.concat = concat;
        lodash.cond = cond;
        lodash.conforms = conforms;
        lodash.constant = constant;
        lodash.countBy = countBy;
        lodash.create = create;
        lodash.curry = curry;
        lodash.curryRight = curryRight;
        lodash.debounce = debounce;
        lodash.defaults = defaults;
        lodash.defaultsDeep = defaultsDeep;
        lodash.defer = defer;
        lodash.delay = delay;
        lodash.difference = difference;
        lodash.differenceBy = differenceBy;
        lodash.differenceWith = differenceWith;
        lodash.drop = drop;
        lodash.dropRight = dropRight;
        lodash.dropRightWhile = dropRightWhile;
        lodash.dropWhile = dropWhile;
        lodash.fill = fill;
        lodash.filter = filter;
        lodash.flatMap = flatMap;
        lodash.flatMapDeep = flatMapDeep;
        lodash.flatMapDepth = flatMapDepth;
        lodash.flatten = flatten;
        lodash.flattenDeep = flattenDeep;
        lodash.flattenDepth = flattenDepth;
        lodash.flip = flip;
        lodash.flow = flow;
        lodash.flowRight = flowRight;
        lodash.fromPairs = fromPairs;
        lodash.functions = functions;
        lodash.functionsIn = functionsIn;
        lodash.groupBy = groupBy;
        lodash.initial = initial;
        lodash.intersection = intersection;
        lodash.intersectionBy = intersectionBy;
        lodash.intersectionWith = intersectionWith;
        lodash.invert = invert;
        lodash.invertBy = invertBy;
        lodash.invokeMap = invokeMap;
        lodash.iteratee = iteratee;
        lodash.keyBy = keyBy;
        lodash.keys = keys;
        lodash.keysIn = keysIn;
        lodash.map = map;
        lodash.mapKeys = mapKeys;
        lodash.mapValues = mapValues;
        lodash.matches = matches;
        lodash.matchesProperty = matchesProperty;
        lodash.memoize = memoize;
        lodash.merge = merge;
        lodash.mergeWith = mergeWith;
        lodash.method = method;
        lodash.methodOf = methodOf;
        lodash.mixin = mixin;
        lodash.negate = negate;
        lodash.nthArg = nthArg;
        lodash.omit = omit;
        lodash.omitBy = omitBy;
        lodash.once = once;
        lodash.orderBy = orderBy;
        lodash.over = over;
        lodash.overArgs = overArgs;
        lodash.overEvery = overEvery;
        lodash.overSome = overSome;
        lodash.partial = partial;
        lodash.partialRight = partialRight;
        lodash.partition = partition;
        lodash.pick = pick;
        lodash.pickBy = pickBy;
        lodash.property = property;
        lodash.propertyOf = propertyOf;
        lodash.pull = pull;
        lodash.pullAll = pullAll;
        lodash.pullAllBy = pullAllBy;
        lodash.pullAllWith = pullAllWith;
        lodash.pullAt = pullAt;
        lodash.range = range;
        lodash.rangeRight = rangeRight;
        lodash.rearg = rearg;
        lodash.reject = reject;
        lodash.remove = remove;
        lodash.rest = rest;
        lodash.reverse = reverse;
        lodash.sampleSize = sampleSize;
        lodash.set = set;
        lodash.setWith = setWith;
        lodash.shuffle = shuffle;
        lodash.slice = slice;
        lodash.sortBy = sortBy;
        lodash.sortedUniq = sortedUniq;
        lodash.sortedUniqBy = sortedUniqBy;
        lodash.split = split;
        lodash.spread = spread;
        lodash.tail = tail;
        lodash.take = take;
        lodash.takeRight = takeRight;
        lodash.takeRightWhile = takeRightWhile;
        lodash.takeWhile = takeWhile;
        lodash.tap = tap;
        lodash.throttle = throttle;
        lodash.thru = thru;
        lodash.toArray = toArray;
        lodash.toPairs = toPairs;
        lodash.toPairsIn = toPairsIn;
        lodash.toPath = toPath;
        lodash.toPlainObject = toPlainObject;
        lodash.transform = transform;
        lodash.unary = unary;
        lodash.union = union;
        lodash.unionBy = unionBy;
        lodash.unionWith = unionWith;
        lodash.uniq = uniq;
        lodash.uniqBy = uniqBy;
        lodash.uniqWith = uniqWith;
        lodash.unset = unset;
        lodash.unzip = unzip;
        lodash.unzipWith = unzipWith;
        lodash.update = update;
        lodash.updateWith = updateWith;
        lodash.values = values;
        lodash.valuesIn = valuesIn;
        lodash.without = without;
        lodash.words = words;
        lodash.wrap = wrap;
        lodash.xor = xor;
        lodash.xorBy = xorBy;
        lodash.xorWith = xorWith;
        lodash.zip = zip;
        lodash.zipObject = zipObject;
        lodash.zipObjectDeep = zipObjectDeep;
        lodash.zipWith = zipWith;
        lodash.entries = toPairs;
        lodash.entriesIn = toPairsIn;
        lodash.extend = assignIn;
        lodash.extendWith = assignInWith;
        mixin(lodash, lodash);
        lodash.add = add;
        lodash.attempt = attempt;
        lodash.camelCase = camelCase;
        lodash.capitalize = capitalize;
        lodash.ceil = ceil;
        lodash.clamp = clamp;
        lodash.clone = clone;
        lodash.cloneDeep = cloneDeep;
        lodash.cloneDeepWith = cloneDeepWith;
        lodash.cloneWith = cloneWith;
        lodash.conformsTo = conformsTo;
        lodash.deburr = deburr;
        lodash.defaultTo = defaultTo;
        lodash.divide = divide;
        lodash.endsWith = endsWith;
        lodash.eq = eq;
        lodash.escape = escape;
        lodash.escapeRegExp = escapeRegExp;
        lodash.every = every;
        lodash.find = find;
        lodash.findIndex = findIndex;
        lodash.findKey = findKey;
        lodash.findLast = findLast;
        lodash.findLastIndex = findLastIndex;
        lodash.findLastKey = findLastKey;
        lodash.floor = floor;
        lodash.forEach = forEach;
        lodash.forEachRight = forEachRight;
        lodash.forIn = forIn;
        lodash.forInRight = forInRight;
        lodash.forOwn = forOwn;
        lodash.forOwnRight = forOwnRight;
        lodash.get = get;
        lodash.gt = gt;
        lodash.gte = gte;
        lodash.has = has;
        lodash.hasIn = hasIn;
        lodash.head = head;
        lodash.identity = identity;
        lodash.includes = includes;
        lodash.indexOf = indexOf;
        lodash.inRange = inRange;
        lodash.invoke = invoke;
        lodash.isArguments = isArguments;
        lodash.isArray = isArray;
        lodash.isArrayBuffer = isArrayBuffer;
        lodash.isArrayLike = isArrayLike;
        lodash.isArrayLikeObject = isArrayLikeObject;
        lodash.isBoolean = isBoolean;
        lodash.isBuffer = isBuffer;
        lodash.isDate = isDate;
        lodash.isElement = isElement;
        lodash.isEmpty = isEmpty;
        lodash.isEqual = isEqual;
        lodash.isEqualWith = isEqualWith;
        lodash.isError = isError;
        lodash.isFinite = isFinite2;
        lodash.isFunction = isFunction;
        lodash.isInteger = isInteger;
        lodash.isLength = isLength;
        lodash.isMap = isMap;
        lodash.isMatch = isMatch;
        lodash.isMatchWith = isMatchWith;
        lodash.isNaN = isNaN2;
        lodash.isNative = isNative;
        lodash.isNil = isNil;
        lodash.isNull = isNull;
        lodash.isNumber = isNumber;
        lodash.isObject = isObject;
        lodash.isObjectLike = isObjectLike;
        lodash.isPlainObject = isPlainObject;
        lodash.isRegExp = isRegExp;
        lodash.isSafeInteger = isSafeInteger;
        lodash.isSet = isSet;
        lodash.isString = isString;
        lodash.isSymbol = isSymbol;
        lodash.isTypedArray = isTypedArray;
        lodash.isUndefined = isUndefined;
        lodash.isWeakMap = isWeakMap;
        lodash.isWeakSet = isWeakSet;
        lodash.join = join;
        lodash.kebabCase = kebabCase;
        lodash.last = last;
        lodash.lastIndexOf = lastIndexOf;
        lodash.lowerCase = lowerCase;
        lodash.lowerFirst = lowerFirst;
        lodash.lt = lt;
        lodash.lte = lte;
        lodash.max = max;
        lodash.maxBy = maxBy;
        lodash.mean = mean;
        lodash.meanBy = meanBy;
        lodash.min = min;
        lodash.minBy = minBy;
        lodash.stubArray = stubArray;
        lodash.stubFalse = stubFalse;
        lodash.stubObject = stubObject;
        lodash.stubString = stubString;
        lodash.stubTrue = stubTrue;
        lodash.multiply = multiply;
        lodash.nth = nth;
        lodash.noConflict = noConflict;
        lodash.noop = noop;
        lodash.now = now;
        lodash.pad = pad;
        lodash.padEnd = padEnd;
        lodash.padStart = padStart;
        lodash.parseInt = parseInt2;
        lodash.random = random;
        lodash.reduce = reduce;
        lodash.reduceRight = reduceRight;
        lodash.repeat = repeat;
        lodash.replace = replace;
        lodash.result = result;
        lodash.round = round;
        lodash.runInContext = runInContext2;
        lodash.sample = sample;
        lodash.size = size;
        lodash.snakeCase = snakeCase;
        lodash.some = some;
        lodash.sortedIndex = sortedIndex;
        lodash.sortedIndexBy = sortedIndexBy;
        lodash.sortedIndexOf = sortedIndexOf;
        lodash.sortedLastIndex = sortedLastIndex;
        lodash.sortedLastIndexBy = sortedLastIndexBy;
        lodash.sortedLastIndexOf = sortedLastIndexOf;
        lodash.startCase = startCase;
        lodash.startsWith = startsWith;
        lodash.subtract = subtract;
        lodash.sum = sum;
        lodash.sumBy = sumBy;
        lodash.template = template;
        lodash.times = times;
        lodash.toFinite = toFinite;
        lodash.toInteger = toInteger;
        lodash.toLength = toLength;
        lodash.toLower = toLower;
        lodash.toNumber = toNumber;
        lodash.toSafeInteger = toSafeInteger;
        lodash.toString = toString;
        lodash.toUpper = toUpper;
        lodash.trim = trim;
        lodash.trimEnd = trimEnd;
        lodash.trimStart = trimStart;
        lodash.truncate = truncate;
        lodash.unescape = unescape;
        lodash.uniqueId = uniqueId;
        lodash.upperCase = upperCase;
        lodash.upperFirst = upperFirst;
        lodash.each = forEach;
        lodash.eachRight = forEachRight;
        lodash.first = head;
        mixin(lodash, function() {
          var source = {};
          baseForOwn(lodash, function(func, methodName) {
            if (!hasOwnProperty.call(lodash.prototype, methodName)) {
              source[methodName] = func;
            }
          });
          return source;
        }(), { "chain": false });
        lodash.VERSION = VERSION;
        arrayEach(["bind", "bindKey", "curry", "curryRight", "partial", "partialRight"], function(methodName) {
          lodash[methodName].placeholder = lodash;
        });
        arrayEach(["drop", "take"], function(methodName, index) {
          LazyWrapper.prototype[methodName] = function(n) {
            n = n === undefined2 ? 1 : nativeMax(toInteger(n), 0);
            var result2 = this.__filtered__ && !index ? new LazyWrapper(this) : this.clone();
            if (result2.__filtered__) {
              result2.__takeCount__ = nativeMin(n, result2.__takeCount__);
            } else {
              result2.__views__.push({
                "size": nativeMin(n, MAX_ARRAY_LENGTH),
                "type": methodName + (result2.__dir__ < 0 ? "Right" : "")
              });
            }
            return result2;
          };
          LazyWrapper.prototype[methodName + "Right"] = function(n) {
            return this.reverse()[methodName](n).reverse();
          };
        });
        arrayEach(["filter", "map", "takeWhile"], function(methodName, index) {
          var type = index + 1, isFilter = type == LAZY_FILTER_FLAG || type == LAZY_WHILE_FLAG;
          LazyWrapper.prototype[methodName] = function(iteratee2) {
            var result2 = this.clone();
            result2.__iteratees__.push({
              "iteratee": getIteratee(iteratee2, 3),
              "type": type
            });
            result2.__filtered__ = result2.__filtered__ || isFilter;
            return result2;
          };
        });
        arrayEach(["head", "last"], function(methodName, index) {
          var takeName = "take" + (index ? "Right" : "");
          LazyWrapper.prototype[methodName] = function() {
            return this[takeName](1).value()[0];
          };
        });
        arrayEach(["initial", "tail"], function(methodName, index) {
          var dropName = "drop" + (index ? "" : "Right");
          LazyWrapper.prototype[methodName] = function() {
            return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
          };
        });
        LazyWrapper.prototype.compact = function() {
          return this.filter(identity);
        };
        LazyWrapper.prototype.find = function(predicate) {
          return this.filter(predicate).head();
        };
        LazyWrapper.prototype.findLast = function(predicate) {
          return this.reverse().find(predicate);
        };
        LazyWrapper.prototype.invokeMap = baseRest(function(path, args) {
          if (typeof path == "function") {
            return new LazyWrapper(this);
          }
          return this.map(function(value) {
            return baseInvoke(value, path, args);
          });
        });
        LazyWrapper.prototype.reject = function(predicate) {
          return this.filter(negate(getIteratee(predicate)));
        };
        LazyWrapper.prototype.slice = function(start, end) {
          start = toInteger(start);
          var result2 = this;
          if (result2.__filtered__ && (start > 0 || end < 0)) {
            return new LazyWrapper(result2);
          }
          if (start < 0) {
            result2 = result2.takeRight(-start);
          } else if (start) {
            result2 = result2.drop(start);
          }
          if (end !== undefined2) {
            end = toInteger(end);
            result2 = end < 0 ? result2.dropRight(-end) : result2.take(end - start);
          }
          return result2;
        };
        LazyWrapper.prototype.takeRightWhile = function(predicate) {
          return this.reverse().takeWhile(predicate).reverse();
        };
        LazyWrapper.prototype.toArray = function() {
          return this.take(MAX_ARRAY_LENGTH);
        };
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var checkIteratee = /^(?:filter|find|map|reject)|While$/.test(methodName), isTaker = /^(?:head|last)$/.test(methodName), lodashFunc = lodash[isTaker ? "take" + (methodName == "last" ? "Right" : "") : methodName], retUnwrapped = isTaker || /^find/.test(methodName);
          if (!lodashFunc) {
            return;
          }
          lodash.prototype[methodName] = function() {
            var value = this.__wrapped__, args = isTaker ? [1] : arguments, isLazy = value instanceof LazyWrapper, iteratee2 = args[0], useLazy = isLazy || isArray(value);
            var interceptor = function(value2) {
              var result3 = lodashFunc.apply(lodash, arrayPush([value2], args));
              return isTaker && chainAll ? result3[0] : result3;
            };
            if (useLazy && checkIteratee && typeof iteratee2 == "function" && iteratee2.length != 1) {
              isLazy = useLazy = false;
            }
            var chainAll = this.__chain__, isHybrid = !!this.__actions__.length, isUnwrapped = retUnwrapped && !chainAll, onlyLazy = isLazy && !isHybrid;
            if (!retUnwrapped && useLazy) {
              value = onlyLazy ? value : new LazyWrapper(this);
              var result2 = func.apply(value, args);
              result2.__actions__.push({ "func": thru, "args": [interceptor], "thisArg": undefined2 });
              return new LodashWrapper(result2, chainAll);
            }
            if (isUnwrapped && onlyLazy) {
              return func.apply(this, args);
            }
            result2 = this.thru(interceptor);
            return isUnwrapped ? isTaker ? result2.value()[0] : result2.value() : result2;
          };
        });
        arrayEach(["pop", "push", "shift", "sort", "splice", "unshift"], function(methodName) {
          var func = arrayProto[methodName], chainName = /^(?:push|sort|unshift)$/.test(methodName) ? "tap" : "thru", retUnwrapped = /^(?:pop|shift)$/.test(methodName);
          lodash.prototype[methodName] = function() {
            var args = arguments;
            if (retUnwrapped && !this.__chain__) {
              var value = this.value();
              return func.apply(isArray(value) ? value : [], args);
            }
            return this[chainName](function(value2) {
              return func.apply(isArray(value2) ? value2 : [], args);
            });
          };
        });
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var lodashFunc = lodash[methodName];
          if (lodashFunc) {
            var key = lodashFunc.name + "";
            if (!hasOwnProperty.call(realNames, key)) {
              realNames[key] = [];
            }
            realNames[key].push({ "name": methodName, "func": lodashFunc });
          }
        });
        realNames[createHybrid(undefined2, WRAP_BIND_KEY_FLAG).name] = [{
          "name": "wrapper",
          "func": undefined2
        }];
        LazyWrapper.prototype.clone = lazyClone;
        LazyWrapper.prototype.reverse = lazyReverse;
        LazyWrapper.prototype.value = lazyValue;
        lodash.prototype.at = wrapperAt;
        lodash.prototype.chain = wrapperChain;
        lodash.prototype.commit = wrapperCommit;
        lodash.prototype.next = wrapperNext;
        lodash.prototype.plant = wrapperPlant;
        lodash.prototype.reverse = wrapperReverse;
        lodash.prototype.toJSON = lodash.prototype.valueOf = lodash.prototype.value = wrapperValue;
        lodash.prototype.first = lodash.prototype.head;
        if (symIterator) {
          lodash.prototype[symIterator] = wrapperToIterator;
        }
        return lodash;
      };
      var _ = runInContext();
      if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
        root._ = _;
        define(function() {
          return _;
        });
      } else if (freeModule) {
        (freeModule.exports = _)._ = _;
        freeExports._ = _;
      } else {
        root._ = _;
      }
    }).call(exports2);
  }
});

// out/utils/consts.js
var require_consts = __commonJS({
  "out/utils/consts.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.YES_MESSAGE = exports2.GIT_FOLDER = exports2.GLOB_ROOT = void 0;
    exports2.GLOB_ROOT = "*";
    exports2.GIT_FOLDER = ".git";
    exports2.YES_MESSAGE = "Yes, go for it";
  }
});

// out/utils/ui.js
var require_ui = __commonJS({
  "out/utils/ui.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __awaiter2 = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.warnBefore = exports2.showErrorMessageWithMoreInfo = exports2.showErrorMessage = exports2.showDoneableInfo = exports2.showInfoMessageWithTimeout = void 0;
    var vscode_12 = require("vscode");
    var os_1 = __importDefault(require("os"));
    var logger = __importStar(require_logger());
    var globalState_12 = require_globalState();
    var configuration_12 = require_configuration();
    var consts_1 = require_consts();
    function showInfoMessageWithTimeout(message, timeout = 3e3) {
      const upTo = timeout / 10;
      vscode_12.window.withProgress({
        location: vscode_12.ProgressLocation.Notification,
        title: message,
        cancellable: true
      }, (progress) => __awaiter2(this, void 0, void 0, function* () {
        let counter = 0;
        return new Promise((resolve) => {
          const interval = setInterval(() => {
            progress.report({ increment: counter / upTo });
            if (++counter === upTo) {
              clearInterval(interval);
              resolve();
            }
          }, 10);
        });
      }));
    }
    exports2.showInfoMessageWithTimeout = showInfoMessageWithTimeout;
    function showDoneableInfo(title, callback) {
      return __awaiter2(this, void 0, void 0, function* () {
        yield vscode_12.window.withProgress({
          location: vscode_12.ProgressLocation.Notification,
          title
        }, () => __awaiter2(this, void 0, void 0, function* () {
          return callback();
        }));
      });
    }
    exports2.showDoneableInfo = showDoneableInfo;
    function showErrorMessage(message, error) {
      return __awaiter2(this, void 0, void 0, function* () {
        if ((yield vscode_12.window.showErrorMessage(message, "Report")) === "Report") {
          try {
            const body = `**Original message**: ${message}

**System Info**
Editor version: ${vscode_12.version}
Extension version: ${globalState_12.globalState.extensionVersion}
OS: ${os_1.default.platform()} ${os_1.default.release()}

**Stack**
${error.stack || error.message || error}
`;
            const url = `https://github.com/moshfeu/vscode-compare-folders/issues/new?title=[error] ${error.message || error}&body=${body}`;
            const uri = vscode_12.Uri.parse(url);
            vscode_12.env.openExternal(uri);
          } catch (error2) {
            logger.log(error2);
          }
        }
      });
    }
    exports2.showErrorMessage = showErrorMessage;
    function showErrorMessageWithMoreInfo(message, link) {
      return __awaiter2(this, void 0, void 0, function* () {
        const moreInfo = "More Info";
        const result = yield vscode_12.window.showErrorMessage(message, moreInfo);
        if (result === moreInfo) {
          vscode_12.env.openExternal(vscode_12.Uri.parse(link));
        }
      });
    }
    exports2.showErrorMessageWithMoreInfo = showErrorMessageWithMoreInfo;
    var warnBefore = (message) => __awaiter2(void 0, void 0, void 0, function* () {
      if ((0, configuration_12.getConfiguration)("warnBeforeTake")) {
        return consts_1.YES_MESSAGE === (yield vscode_12.window.showInformationMessage(message, {
          modal: true
        }, consts_1.YES_MESSAGE));
      }
      return true;
    });
    exports2.warnBefore = warnBefore;
  }
});

// out/services/ignoreExtensionTools.js
var require_ignoreExtensionTools = __commonJS({
  "out/services/ignoreExtensionTools.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.compareIgnoredExtension = exports2.validate = exports2.compareName = void 0;
    var lodash_1 = require_lodash();
    var path = __importStar(require("path"));
    var ui_12 = require_ui();
    var configuration_12 = require_configuration();
    function extnameOnly(name) {
      return path.extname(name).replace(".", "");
    }
    function compareName(name1, name2, options) {
      var _a;
      if (options.ignoreCase) {
        name1 = name1.toLowerCase();
        name2 = name2.toLowerCase();
      }
      (_a = options.ignoreExtension) === null || _a === void 0 ? void 0 : _a.forEach((exts, index) => {
        if (exts.includes(extnameOnly(name1))) {
          name1 = identityExtension(name1, index);
        }
        if (exts.includes(extnameOnly(name2))) {
          name2 = identityExtension(name2, index);
        }
      });
      return strcmp(name1, name2);
    }
    exports2.compareName = compareName;
    function showValidation(message) {
      (0, ui_12.showErrorMessageWithMoreInfo)(message, "https://github.com/moshfeu/vscode-compare-folders#options-under-vscode-settings");
    }
    function validate() {
      const ignoreExtension = (0, configuration_12.getConfiguration)("ignoreExtension");
      if (!ignoreExtension) {
        return true;
      }
      if (!Array.isArray(ignoreExtension)) {
        showValidation(`"ignoreExtension" settings should be array of pairs.`);
        return false;
      }
      const duplicates = (0, lodash_1.flatten)(ignoreExtension).filter(/* @__PURE__ */ ((s) => (v) => s.has(v) || !s.add(v))(/* @__PURE__ */ new Set()));
      if (duplicates.length) {
        showValidation(`"ignoreExtension" settings contains duplicate extensions: ${duplicates.join(",")}`);
        return false;
      }
      return true;
    }
    exports2.validate = validate;
    function identityExtension(name, id) {
      return path.basename(name).replace(path.extname(name), `.$ext${id}`);
    }
    function strcmp(str1, str2) {
      return str1 === str2 ? 0 : str1 > str2 ? 1 : -1;
    }
    function compareIgnoredExtension(file1, file2) {
      return path.extname(file1) !== path.extname(file2);
    }
    exports2.compareIgnoredExtension = compareIgnoredExtension;
  }
});

// out/services/fs.js
var require_fs2 = __commonJS({
  "out/services/fs.js"(exports2) {
    "use strict";
    var __awaiter2 = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.resourceExists = exports2.readFileSync = exports2.pathExistsSync = void 0;
    var vscode_12 = require("vscode");
    var fs_extra_1 = require_lib();
    var pathExistsSync = (path) => {
      return (0, fs_extra_1.pathExistsSync)(path);
    };
    exports2.pathExistsSync = pathExistsSync;
    var readFileSync = (path, encoding) => {
      return (0, fs_extra_1.readFileSync)(path, encoding);
    };
    exports2.readFileSync = readFileSync;
    function resourceExists(uri) {
      return __awaiter2(this, void 0, void 0, function* () {
        try {
          yield vscode_12.workspace.fs.stat(uri);
          return true;
        } catch (error) {
          return false;
        }
      });
    }
    exports2.resourceExists = resourceExists;
  }
});

// out/services/validators.js
var require_validators = __commonJS({
  "out/services/validators.js"(exports2) {
    "use strict";
    var __awaiter2 = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.foldersNotExist = exports2.showUnaccessibleWarning = exports2.validatePermissions = void 0;
    var fs_1 = require("fs");
    var vscode_12 = require("vscode");
    var ui_12 = require_ui();
    var fs_2 = require_fs2();
    var NOT_ACCESSIBLE = "is not accessible";
    function validatePermissions(path1, path2) {
      return __awaiter2(this, void 0, void 0, function* () {
        if (yield validatePath(path1)) {
          validatePath(path2);
        }
      });
    }
    exports2.validatePermissions = validatePermissions;
    function showUnaccessibleWarning(path) {
      return (0, ui_12.showInfoMessageWithTimeout)(`${path} ${NOT_ACCESSIBLE}`, 4e3);
    }
    exports2.showUnaccessibleWarning = showUnaccessibleWarning;
    function validatePath(path) {
      return __awaiter2(this, void 0, void 0, function* () {
        if (yield hasPermissionDenied(path)) {
          showUnaccessibleWarning(path);
          return false;
        }
        return true;
      });
    }
    function hasPermissionDenied(entryPath) {
      return __awaiter2(this, void 0, void 0, function* () {
        try {
          yield fs_1.promises.access(entryPath, fs_1.constants.R_OK);
          return false;
        } catch (_a) {
          return true;
        }
      });
    }
    function foldersNotExist({ fsPath: uri1 }, { fsPath: uri2 }) {
      return __awaiter2(this, void 0, void 0, function* () {
        const existsAsync = yield Promise.all([vscode_12.Uri.file(uri1), vscode_12.Uri.file(uri2)].map(fs_2.resourceExists));
        const notExist = existsAsync.some((exists) => !exists);
        return notExist;
      });
    }
    exports2.foldersNotExist = foldersNotExist;
  }
});

// out/services/includeExcludeFilesGetter.js
var require_includeExcludeFilesGetter = __commonJS({
  "out/services/includeExcludeFilesGetter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getIncludeAndExcludePaths = void 0;
    var ui_12 = require_ui();
    var configuration_12 = require_configuration();
    var logger_1 = require_logger();
    function getFilesFilterByType(type) {
      const filesFilter = (0, configuration_12.getConfiguration)(type);
      return filesFilter !== null && filesFilter !== void 0 ? filesFilter : [];
    }
    function getIncludeAndExcludePaths() {
      try {
        const excludeFiles = getFilesFilterByType("excludeFilter");
        const includeFiles = getFilesFilterByType("includeFilter");
        return {
          excludeFilter: excludeFiles.join(","),
          includeFilter: includeFiles.join(",")
        };
      } catch (error) {
        (0, ui_12.showErrorMessage)("Error while parsing include/exclude files", error);
        (0, logger_1.log)(error);
        return {
          excludeFilter: "",
          includeFilter: ""
        };
      }
    }
    exports2.getIncludeAndExcludePaths = getIncludeAndExcludePaths;
  }
});

// node_modules/@cjs-exporter/globby/dist/index.js
var require_dist = __commonJS({
  "node_modules/@cjs-exporter/globby/dist/index.js"(exports2, module2) {
    var ra = Object.create;
    var Ye = Object.defineProperty;
    var na = Object.getOwnPropertyDescriptor;
    var sa = Object.getOwnPropertyNames;
    var ia = Object.getPrototypeOf;
    var oa = Object.prototype.hasOwnProperty;
    var y = (e, t) => () => (t || e((t = { exports: {} }).exports, t), t.exports);
    var aa = (e, t) => {
      for (var r in t)
        Ye(e, r, { get: t[r], enumerable: true });
    };
    var Tn = (e, t, r, n) => {
      if (t && typeof t == "object" || typeof t == "function")
        for (let s of sa(t))
          !oa.call(e, s) && s !== r && Ye(e, s, { get: () => t[s], enumerable: !(n = na(t, s)) || n.enumerable });
      return e;
    };
    var re = (e, t, r) => (r = e != null ? ra(ia(e)) : {}, Tn(t || !e || !e.__esModule ? Ye(r, "default", { value: e, enumerable: true }) : r, e));
    var ua = (e) => Tn(Ye({}, "__esModule", { value: true }), e);
    var Lt = y((Vf, kn) => {
      "use strict";
      var ca = require("stream"), On = ca.PassThrough, la = Array.prototype.slice;
      kn.exports = fa;
      function fa() {
        let e = [], t = la.call(arguments), r = false, n = t[t.length - 1];
        n && !Array.isArray(n) && n.pipe == null ? t.pop() : n = {};
        let s = n.end !== false, i = n.pipeError === true;
        n.objectMode == null && (n.objectMode = true), n.highWaterMark == null && (n.highWaterMark = 64 * 1024);
        let o = On(n);
        function a() {
          for (let f = 0, g = arguments.length; f < g; f++)
            e.push(Ln(arguments[f], n));
          return u(), this;
        }
        function u() {
          if (r)
            return;
          r = true;
          let f = e.shift();
          if (!f) {
            process.nextTick(d);
            return;
          }
          Array.isArray(f) || (f = [f]);
          let g = f.length + 1;
          function p() {
            --g > 0 || (r = false, u());
          }
          function T(S) {
            function E() {
              S.removeListener("merge2UnpipeEnd", E), S.removeListener("end", E), i && S.removeListener("error", b), p();
            }
            function b(v) {
              o.emit("error", v);
            }
            if (S._readableState.endEmitted)
              return p();
            S.on("merge2UnpipeEnd", E), S.on("end", E), i && S.on("error", b), S.pipe(o, { end: false }), S.resume();
          }
          for (let S = 0; S < f.length; S++)
            T(f[S]);
          p();
        }
        function d() {
          r = false, o.emit("queueDrain"), s && o.end();
        }
        return o.setMaxListeners(0), o.add = a, o.on("unpipe", function(f) {
          f.emit("merge2UnpipeEnd");
        }), t.length && a.apply(null, t), o;
      }
      function Ln(e, t) {
        if (Array.isArray(e))
          for (let r = 0, n = e.length; r < n; r++)
            e[r] = Ln(e[r], t);
        else {
          if (!e._readableState && e.pipe && (e = e.pipe(On(t))), !e._readableState || !e.pause || !e.pipe)
            throw new Error("Only readable stream can be merged.");
          e.pause();
        }
        return e;
      }
    });
    var $n = y((Ce) => {
      "use strict";
      Object.defineProperty(Ce, "__esModule", { value: true });
      Ce.splitWhen = Ce.flatten = void 0;
      function pa(e) {
        return e.reduce((t, r) => [].concat(t, r), []);
      }
      Ce.flatten = pa;
      function ha(e, t) {
        let r = [[]], n = 0;
        for (let s of e)
          t(s) ? (n++, r[n] = []) : r[n].push(s);
        return r;
      }
      Ce.splitWhen = ha;
    });
    var Hn = y((Ze) => {
      "use strict";
      Object.defineProperty(Ze, "__esModule", { value: true });
      Ze.isEnoentCodeError = void 0;
      function da(e) {
        return e.code === "ENOENT";
      }
      Ze.isEnoentCodeError = da;
    });
    var In = y((ze) => {
      "use strict";
      Object.defineProperty(ze, "__esModule", { value: true });
      ze.createDirentFromStats = void 0;
      var kt = class {
        constructor(t, r) {
          this.name = t, this.isBlockDevice = r.isBlockDevice.bind(r), this.isCharacterDevice = r.isCharacterDevice.bind(r), this.isDirectory = r.isDirectory.bind(r), this.isFIFO = r.isFIFO.bind(r), this.isFile = r.isFile.bind(r), this.isSocket = r.isSocket.bind(r), this.isSymbolicLink = r.isSymbolicLink.bind(r);
        }
      };
      function _a(e, t) {
        return new kt(e, t);
      }
      ze.createDirentFromStats = _a;
    });
    var Dn = y((ne) => {
      "use strict";
      Object.defineProperty(ne, "__esModule", { value: true });
      ne.removeLeadingDotSegment = ne.escape = ne.makeAbsolute = ne.unixify = void 0;
      var ga = require("path"), ya = 2, Sa = /(\\?)([()*?[\]{|}]|^!|[!+@](?=\())/g;
      function ma(e) {
        return e.replace(/\\/g, "/");
      }
      ne.unixify = ma;
      function Ea(e, t) {
        return ga.resolve(e, t);
      }
      ne.makeAbsolute = Ea;
      function Aa(e) {
        return e.replace(Sa, "\\$2");
      }
      ne.escape = Aa;
      function Ra(e) {
        if (e.charAt(0) === ".") {
          let t = e.charAt(1);
          if (t === "/" || t === "\\")
            return e.slice(ya);
        }
        return e;
      }
      ne.removeLeadingDotSegment = Ra;
    });
    var Mn = y((Zf, Nn) => {
      Nn.exports = function(t) {
        if (typeof t != "string" || t === "")
          return false;
        for (var r; r = /(\\).|([@?!+*]\(.*\))/g.exec(t); ) {
          if (r[2])
            return true;
          t = t.slice(r.index + r[0].length);
        }
        return false;
      };
    });
    var Bn = y((zf, qn) => {
      var ba = Mn(), Fn = { "{": "}", "(": ")", "[": "]" }, va = function(e) {
        if (e[0] === "!")
          return true;
        for (var t = 0, r = -2, n = -2, s = -2, i = -2, o = -2; t < e.length; ) {
          if (e[t] === "*" || e[t + 1] === "?" && /[\].+)]/.test(e[t]) || n !== -1 && e[t] === "[" && e[t + 1] !== "]" && (n < t && (n = e.indexOf("]", t)), n > t && (o === -1 || o > n || (o = e.indexOf("\\", t), o === -1 || o > n))) || s !== -1 && e[t] === "{" && e[t + 1] !== "}" && (s = e.indexOf("}", t), s > t && (o = e.indexOf("\\", t), o === -1 || o > s)) || i !== -1 && e[t] === "(" && e[t + 1] === "?" && /[:!=]/.test(e[t + 2]) && e[t + 3] !== ")" && (i = e.indexOf(")", t), i > t && (o = e.indexOf("\\", t), o === -1 || o > i)) || r !== -1 && e[t] === "(" && e[t + 1] !== "|" && (r < t && (r = e.indexOf("|", t)), r !== -1 && e[r + 1] !== ")" && (i = e.indexOf(")", r), i > r && (o = e.indexOf("\\", r), o === -1 || o > i))))
            return true;
          if (e[t] === "\\") {
            var a = e[t + 1];
            t += 2;
            var u = Fn[a];
            if (u) {
              var d = e.indexOf(u, t);
              d !== -1 && (t = d + 1);
            }
            if (e[t] === "!")
              return true;
          } else
            t++;
        }
        return false;
      }, xa = function(e) {
        if (e[0] === "!")
          return true;
        for (var t = 0; t < e.length; ) {
          if (/[*?{}()[\]]/.test(e[t]))
            return true;
          if (e[t] === "\\") {
            var r = e[t + 1];
            t += 2;
            var n = Fn[r];
            if (n) {
              var s = e.indexOf(n, t);
              s !== -1 && (t = s + 1);
            }
            if (e[t] === "!")
              return true;
          } else
            t++;
        }
        return false;
      };
      qn.exports = function(t, r) {
        if (typeof t != "string" || t === "")
          return false;
        if (ba(t))
          return true;
        var n = va;
        return r && r.strict === false && (n = xa), n(t);
      };
    });
    var jn = y((Jf, Gn) => {
      "use strict";
      var Pa = Bn(), wa = require("path").posix.dirname, Ca = require("os").platform() === "win32", $t = "/", Ta = /\\/g, Oa = /[\{\[].*[\}\]]$/, La = /(^|[^\\])([\{\[]|\([^\)]+$)/, ka = /\\([\!\*\?\|\[\]\(\)\{\}])/g;
      Gn.exports = function(t, r) {
        var n = Object.assign({ flipBackslashes: true }, r);
        n.flipBackslashes && Ca && t.indexOf($t) < 0 && (t = t.replace(Ta, $t)), Oa.test(t) && (t += $t), t += "a";
        do
          t = wa(t);
        while (Pa(t) || La.test(t));
        return t.replace(ka, "$1");
      };
    });
    var Je = y((z) => {
      "use strict";
      z.isInteger = (e) => typeof e == "number" ? Number.isInteger(e) : typeof e == "string" && e.trim() !== "" ? Number.isInteger(Number(e)) : false;
      z.find = (e, t) => e.nodes.find((r) => r.type === t);
      z.exceedsLimit = (e, t, r = 1, n) => n === false || !z.isInteger(e) || !z.isInteger(t) ? false : (Number(t) - Number(e)) / Number(r) >= n;
      z.escapeNode = (e, t = 0, r) => {
        let n = e.nodes[t];
        n && (r && n.type === r || n.type === "open" || n.type === "close") && n.escaped !== true && (n.value = "\\" + n.value, n.escaped = true);
      };
      z.encloseBrace = (e) => e.type !== "brace" || e.commas >> 0 + e.ranges >> 0 ? false : (e.invalid = true, true);
      z.isInvalidBrace = (e) => e.type !== "brace" ? false : e.invalid === true || e.dollar ? true : !(e.commas >> 0 + e.ranges >> 0) || e.open !== true || e.close !== true ? (e.invalid = true, true) : false;
      z.isOpenOrClose = (e) => e.type === "open" || e.type === "close" ? true : e.open === true || e.close === true;
      z.reduce = (e) => e.reduce((t, r) => (r.type === "text" && t.push(r.value), r.type === "range" && (r.type = "text"), t), []);
      z.flatten = (...e) => {
        let t = [], r = (n) => {
          for (let s = 0; s < n.length; s++) {
            let i = n[s];
            Array.isArray(i) ? r(i, t) : i !== void 0 && t.push(i);
          }
          return t;
        };
        return r(e), t;
      };
    });
    var et = y((tp, Wn) => {
      "use strict";
      var Un = Je();
      Wn.exports = (e, t = {}) => {
        let r = (n, s = {}) => {
          let i = t.escapeInvalid && Un.isInvalidBrace(s), o = n.invalid === true && t.escapeInvalid === true, a = "";
          if (n.value)
            return (i || o) && Un.isOpenOrClose(n) ? "\\" + n.value : n.value;
          if (n.value)
            return n.value;
          if (n.nodes)
            for (let u of n.nodes)
              a += r(u);
          return a;
        };
        return r(e);
      };
    });
    var Kn = y((rp, Vn) => {
      "use strict";
      Vn.exports = function(e) {
        return typeof e == "number" ? e - e === 0 : typeof e == "string" && e.trim() !== "" ? Number.isFinite ? Number.isFinite(+e) : isFinite(+e) : false;
      };
    });
    var rs = y((np, ts) => {
      "use strict";
      var Xn = Kn(), Ee = (e, t, r) => {
        if (Xn(e) === false)
          throw new TypeError("toRegexRange: expected the first argument to be a number");
        if (t === void 0 || e === t)
          return String(e);
        if (Xn(t) === false)
          throw new TypeError("toRegexRange: expected the second argument to be a number.");
        let n = { relaxZeros: true, ...r };
        typeof n.strictZeros == "boolean" && (n.relaxZeros = n.strictZeros === false);
        let s = String(n.relaxZeros), i = String(n.shorthand), o = String(n.capture), a = String(n.wrap), u = e + ":" + t + "=" + s + i + o + a;
        if (Ee.cache.hasOwnProperty(u))
          return Ee.cache[u].result;
        let d = Math.min(e, t), f = Math.max(e, t);
        if (Math.abs(d - f) === 1) {
          let E = e + "|" + t;
          return n.capture ? `(${E})` : n.wrap === false ? E : `(?:${E})`;
        }
        let g = es(e) || es(t), p = { min: e, max: t, a: d, b: f }, T = [], S = [];
        if (g && (p.isPadded = g, p.maxLen = String(p.max).length), d < 0) {
          let E = f < 0 ? Math.abs(f) : 1;
          S = Qn(E, Math.abs(d), p, n), d = p.a = 0;
        }
        return f >= 0 && (T = Qn(d, f, p, n)), p.negatives = S, p.positives = T, p.result = $a(S, T, n), n.capture === true ? p.result = `(${p.result})` : n.wrap !== false && T.length + S.length > 1 && (p.result = `(?:${p.result})`), Ee.cache[u] = p, p.result;
      };
      function $a(e, t, r) {
        let n = Ht(e, t, "-", false, r) || [], s = Ht(t, e, "", false, r) || [], i = Ht(e, t, "-?", true, r) || [];
        return n.concat(i).concat(s).join("|");
      }
      function Ha(e, t) {
        let r = 1, n = 1, s = Zn(e, r), i = /* @__PURE__ */ new Set([t]);
        for (; e <= s && s <= t; )
          i.add(s), r += 1, s = Zn(e, r);
        for (s = zn(t + 1, n) - 1; e < s && s <= t; )
          i.add(s), n += 1, s = zn(t + 1, n) - 1;
        return i = [...i], i.sort(Na), i;
      }
      function Ia(e, t, r) {
        if (e === t)
          return { pattern: e, count: [], digits: 0 };
        let n = Da(e, t), s = n.length, i = "", o = 0;
        for (let a = 0; a < s; a++) {
          let [u, d] = n[a];
          u === d ? i += u : u !== "0" || d !== "9" ? i += Ma(u, d, r) : o++;
        }
        return o && (i += r.shorthand === true ? "\\d" : "[0-9]"), { pattern: i, count: [o], digits: s };
      }
      function Qn(e, t, r, n) {
        let s = Ha(e, t), i = [], o = e, a;
        for (let u = 0; u < s.length; u++) {
          let d = s[u], f = Ia(String(o), String(d), n), g = "";
          if (!r.isPadded && a && a.pattern === f.pattern) {
            a.count.length > 1 && a.count.pop(), a.count.push(f.count[0]), a.string = a.pattern + Jn(a.count), o = d + 1;
            continue;
          }
          r.isPadded && (g = Fa(d, r, n)), f.string = g + f.pattern + Jn(f.count), i.push(f), o = d + 1, a = f;
        }
        return i;
      }
      function Ht(e, t, r, n, s) {
        let i = [];
        for (let o of e) {
          let { string: a } = o;
          !n && !Yn(t, "string", a) && i.push(r + a), n && Yn(t, "string", a) && i.push(r + a);
        }
        return i;
      }
      function Da(e, t) {
        let r = [];
        for (let n = 0; n < e.length; n++)
          r.push([e[n], t[n]]);
        return r;
      }
      function Na(e, t) {
        return e > t ? 1 : t > e ? -1 : 0;
      }
      function Yn(e, t, r) {
        return e.some((n) => n[t] === r);
      }
      function Zn(e, t) {
        return Number(String(e).slice(0, -t) + "9".repeat(t));
      }
      function zn(e, t) {
        return e - e % Math.pow(10, t);
      }
      function Jn(e) {
        let [t = 0, r = ""] = e;
        return r || t > 1 ? `{${t + (r ? "," + r : "")}}` : "";
      }
      function Ma(e, t, r) {
        return `[${e}${t - e === 1 ? "" : "-"}${t}]`;
      }
      function es(e) {
        return /^-?(0+)\d/.test(e);
      }
      function Fa(e, t, r) {
        if (!t.isPadded)
          return e;
        let n = Math.abs(t.maxLen - String(e).length), s = r.relaxZeros !== false;
        switch (n) {
          case 0:
            return "";
          case 1:
            return s ? "0?" : "0";
          case 2:
            return s ? "0{0,2}" : "00";
          default:
            return s ? `0{0,${n}}` : `0{${n}}`;
        }
      }
      Ee.cache = {};
      Ee.clearCache = () => Ee.cache = {};
      ts.exports = Ee;
    });
    var Nt = y((sp, ls) => {
      "use strict";
      var qa = require("util"), is = rs(), ns = (e) => e !== null && typeof e == "object" && !Array.isArray(e), Ba = (e) => (t) => e === true ? Number(t) : String(t), It = (e) => typeof e == "number" || typeof e == "string" && e !== "", Fe = (e) => Number.isInteger(+e), Dt = (e) => {
        let t = `${e}`, r = -1;
        if (t[0] === "-" && (t = t.slice(1)), t === "0")
          return false;
        for (; t[++r] === "0"; )
          ;
        return r > 0;
      }, Ga = (e, t, r) => typeof e == "string" || typeof t == "string" ? true : r.stringify === true, ja = (e, t, r) => {
        if (t > 0) {
          let n = e[0] === "-" ? "-" : "";
          n && (e = e.slice(1)), e = n + e.padStart(n ? t - 1 : t, "0");
        }
        return r === false ? String(e) : e;
      }, ss = (e, t) => {
        let r = e[0] === "-" ? "-" : "";
        for (r && (e = e.slice(1), t--); e.length < t; )
          e = "0" + e;
        return r ? "-" + e : e;
      }, Ua = (e, t) => {
        e.negatives.sort((o, a) => o < a ? -1 : o > a ? 1 : 0), e.positives.sort((o, a) => o < a ? -1 : o > a ? 1 : 0);
        let r = t.capture ? "" : "?:", n = "", s = "", i;
        return e.positives.length && (n = e.positives.join("|")), e.negatives.length && (s = `-(${r}${e.negatives.join("|")})`), n && s ? i = `${n}|${s}` : i = n || s, t.wrap ? `(${r}${i})` : i;
      }, os = (e, t, r, n) => {
        if (r)
          return is(e, t, { wrap: false, ...n });
        let s = String.fromCharCode(e);
        if (e === t)
          return s;
        let i = String.fromCharCode(t);
        return `[${s}-${i}]`;
      }, as = (e, t, r) => {
        if (Array.isArray(e)) {
          let n = r.wrap === true, s = r.capture ? "" : "?:";
          return n ? `(${s}${e.join("|")})` : e.join("|");
        }
        return is(e, t, r);
      }, us = (...e) => new RangeError("Invalid range arguments: " + qa.inspect(...e)), cs = (e, t, r) => {
        if (r.strictRanges === true)
          throw us([e, t]);
        return [];
      }, Wa = (e, t) => {
        if (t.strictRanges === true)
          throw new TypeError(`Expected step "${e}" to be a number`);
        return [];
      }, Va = (e, t, r = 1, n = {}) => {
        let s = Number(e), i = Number(t);
        if (!Number.isInteger(s) || !Number.isInteger(i)) {
          if (n.strictRanges === true)
            throw us([e, t]);
          return [];
        }
        s === 0 && (s = 0), i === 0 && (i = 0);
        let o = s > i, a = String(e), u = String(t), d = String(r);
        r = Math.max(Math.abs(r), 1);
        let f = Dt(a) || Dt(u) || Dt(d), g = f ? Math.max(a.length, u.length, d.length) : 0, p = f === false && Ga(e, t, n) === false, T = n.transform || Ba(p);
        if (n.toRegex && r === 1)
          return os(ss(e, g), ss(t, g), true, n);
        let S = { negatives: [], positives: [] }, E = (k) => S[k < 0 ? "negatives" : "positives"].push(Math.abs(k)), b = [], v = 0;
        for (; o ? s >= i : s <= i; )
          n.toRegex === true && r > 1 ? E(s) : b.push(ja(T(s, v), g, p)), s = o ? s - r : s + r, v++;
        return n.toRegex === true ? r > 1 ? Ua(S, n) : as(b, null, { wrap: false, ...n }) : b;
      }, Ka = (e, t, r = 1, n = {}) => {
        if (!Fe(e) && e.length > 1 || !Fe(t) && t.length > 1)
          return cs(e, t, n);
        let s = n.transform || ((p) => String.fromCharCode(p)), i = `${e}`.charCodeAt(0), o = `${t}`.charCodeAt(0), a = i > o, u = Math.min(i, o), d = Math.max(i, o);
        if (n.toRegex && r === 1)
          return os(u, d, false, n);
        let f = [], g = 0;
        for (; a ? i >= o : i <= o; )
          f.push(s(i, g)), i = a ? i - r : i + r, g++;
        return n.toRegex === true ? as(f, null, { wrap: false, options: n }) : f;
      }, tt = (e, t, r, n = {}) => {
        if (t == null && It(e))
          return [e];
        if (!It(e) || !It(t))
          return cs(e, t, n);
        if (typeof r == "function")
          return tt(e, t, 1, { transform: r });
        if (ns(r))
          return tt(e, t, 0, r);
        let s = { ...n };
        return s.capture === true && (s.wrap = true), r = r || s.step || 1, Fe(r) ? Fe(e) && Fe(t) ? Va(e, t, r, s) : Ka(e, t, Math.max(Math.abs(r), 1), s) : r != null && !ns(r) ? Wa(r, s) : tt(e, t, 1, r);
      };
      ls.exports = tt;
    });
    var hs = y((ip, ps) => {
      "use strict";
      var Xa = Nt(), fs = Je(), Qa = (e, t = {}) => {
        let r = (n, s = {}) => {
          let i = fs.isInvalidBrace(s), o = n.invalid === true && t.escapeInvalid === true, a = i === true || o === true, u = t.escapeInvalid === true ? "\\" : "", d = "";
          if (n.isOpen === true || n.isClose === true)
            return u + n.value;
          if (n.type === "open")
            return a ? u + n.value : "(";
          if (n.type === "close")
            return a ? u + n.value : ")";
          if (n.type === "comma")
            return n.prev.type === "comma" ? "" : a ? n.value : "|";
          if (n.value)
            return n.value;
          if (n.nodes && n.ranges > 0) {
            let f = fs.reduce(n.nodes), g = Xa(...f, { ...t, wrap: false, toRegex: true });
            if (g.length !== 0)
              return f.length > 1 && g.length > 1 ? `(${g})` : g;
          }
          if (n.nodes)
            for (let f of n.nodes)
              d += r(f, n);
          return d;
        };
        return r(e);
      };
      ps.exports = Qa;
    });
    var gs = y((op, _s) => {
      "use strict";
      var Ya = Nt(), ds = et(), Te = Je(), Ae = (e = "", t = "", r = false) => {
        let n = [];
        if (e = [].concat(e), t = [].concat(t), !t.length)
          return e;
        if (!e.length)
          return r ? Te.flatten(t).map((s) => `{${s}}`) : t;
        for (let s of e)
          if (Array.isArray(s))
            for (let i of s)
              n.push(Ae(i, t, r));
          else
            for (let i of t)
              r === true && typeof i == "string" && (i = `{${i}}`), n.push(Array.isArray(i) ? Ae(s, i, r) : s + i);
        return Te.flatten(n);
      }, Za = (e, t = {}) => {
        let r = t.rangeLimit === void 0 ? 1e3 : t.rangeLimit, n = (s, i = {}) => {
          s.queue = [];
          let o = i, a = i.queue;
          for (; o.type !== "brace" && o.type !== "root" && o.parent; )
            o = o.parent, a = o.queue;
          if (s.invalid || s.dollar) {
            a.push(Ae(a.pop(), ds(s, t)));
            return;
          }
          if (s.type === "brace" && s.invalid !== true && s.nodes.length === 2) {
            a.push(Ae(a.pop(), ["{}"]));
            return;
          }
          if (s.nodes && s.ranges > 0) {
            let g = Te.reduce(s.nodes);
            if (Te.exceedsLimit(...g, t.step, r))
              throw new RangeError("expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.");
            let p = Ya(...g, t);
            p.length === 0 && (p = ds(s, t)), a.push(Ae(a.pop(), p)), s.nodes = [];
            return;
          }
          let u = Te.encloseBrace(s), d = s.queue, f = s;
          for (; f.type !== "brace" && f.type !== "root" && f.parent; )
            f = f.parent, d = f.queue;
          for (let g = 0; g < s.nodes.length; g++) {
            let p = s.nodes[g];
            if (p.type === "comma" && s.type === "brace") {
              g === 1 && d.push(""), d.push("");
              continue;
            }
            if (p.type === "close") {
              a.push(Ae(a.pop(), d, u));
              continue;
            }
            if (p.value && p.type !== "open") {
              d.push(Ae(d.pop(), p.value));
              continue;
            }
            p.nodes && n(p, s);
          }
          return d;
        };
        return Te.flatten(n(e));
      };
      _s.exports = Za;
    });
    var Ss = y((ap, ys) => {
      "use strict";
      ys.exports = { MAX_LENGTH: 1024 * 64, CHAR_0: "0", CHAR_9: "9", CHAR_UPPERCASE_A: "A", CHAR_LOWERCASE_A: "a", CHAR_UPPERCASE_Z: "Z", CHAR_LOWERCASE_Z: "z", CHAR_LEFT_PARENTHESES: "(", CHAR_RIGHT_PARENTHESES: ")", CHAR_ASTERISK: "*", CHAR_AMPERSAND: "&", CHAR_AT: "@", CHAR_BACKSLASH: "\\", CHAR_BACKTICK: "`", CHAR_CARRIAGE_RETURN: "\r", CHAR_CIRCUMFLEX_ACCENT: "^", CHAR_COLON: ":", CHAR_COMMA: ",", CHAR_DOLLAR: "$", CHAR_DOT: ".", CHAR_DOUBLE_QUOTE: '"', CHAR_EQUAL: "=", CHAR_EXCLAMATION_MARK: "!", CHAR_FORM_FEED: "\f", CHAR_FORWARD_SLASH: "/", CHAR_HASH: "#", CHAR_HYPHEN_MINUS: "-", CHAR_LEFT_ANGLE_BRACKET: "<", CHAR_LEFT_CURLY_BRACE: "{", CHAR_LEFT_SQUARE_BRACKET: "[", CHAR_LINE_FEED: `
`, CHAR_NO_BREAK_SPACE: "\xA0", CHAR_PERCENT: "%", CHAR_PLUS: "+", CHAR_QUESTION_MARK: "?", CHAR_RIGHT_ANGLE_BRACKET: ">", CHAR_RIGHT_CURLY_BRACE: "}", CHAR_RIGHT_SQUARE_BRACKET: "]", CHAR_SEMICOLON: ";", CHAR_SINGLE_QUOTE: "'", CHAR_SPACE: " ", CHAR_TAB: "	", CHAR_UNDERSCORE: "_", CHAR_VERTICAL_LINE: "|", CHAR_ZERO_WIDTH_NOBREAK_SPACE: "\uFEFF" };
    });
    var bs = y((up, Rs) => {
      "use strict";
      var za = et(), { MAX_LENGTH: ms, CHAR_BACKSLASH: Mt, CHAR_BACKTICK: Ja, CHAR_COMMA: eu, CHAR_DOT: tu, CHAR_LEFT_PARENTHESES: ru, CHAR_RIGHT_PARENTHESES: nu, CHAR_LEFT_CURLY_BRACE: su, CHAR_RIGHT_CURLY_BRACE: iu, CHAR_LEFT_SQUARE_BRACKET: Es, CHAR_RIGHT_SQUARE_BRACKET: As, CHAR_DOUBLE_QUOTE: ou, CHAR_SINGLE_QUOTE: au, CHAR_NO_BREAK_SPACE: uu, CHAR_ZERO_WIDTH_NOBREAK_SPACE: cu } = Ss(), lu = (e, t = {}) => {
        if (typeof e != "string")
          throw new TypeError("Expected a string");
        let r = t || {}, n = typeof r.maxLength == "number" ? Math.min(ms, r.maxLength) : ms;
        if (e.length > n)
          throw new SyntaxError(`Input length (${e.length}), exceeds max characters (${n})`);
        let s = { type: "root", input: e, nodes: [] }, i = [s], o = s, a = s, u = 0, d = e.length, f = 0, g = 0, p, T = {}, S = () => e[f++], E = (b) => {
          if (b.type === "text" && a.type === "dot" && (a.type = "text"), a && a.type === "text" && b.type === "text") {
            a.value += b.value;
            return;
          }
          return o.nodes.push(b), b.parent = o, b.prev = a, a = b, b;
        };
        for (E({ type: "bos" }); f < d; )
          if (o = i[i.length - 1], p = S(), !(p === cu || p === uu)) {
            if (p === Mt) {
              E({ type: "text", value: (t.keepEscaping ? p : "") + S() });
              continue;
            }
            if (p === As) {
              E({ type: "text", value: "\\" + p });
              continue;
            }
            if (p === Es) {
              u++;
              let b = true, v;
              for (; f < d && (v = S()); ) {
                if (p += v, v === Es) {
                  u++;
                  continue;
                }
                if (v === Mt) {
                  p += S();
                  continue;
                }
                if (v === As && (u--, u === 0))
                  break;
              }
              E({ type: "text", value: p });
              continue;
            }
            if (p === ru) {
              o = E({ type: "paren", nodes: [] }), i.push(o), E({ type: "text", value: p });
              continue;
            }
            if (p === nu) {
              if (o.type !== "paren") {
                E({ type: "text", value: p });
                continue;
              }
              o = i.pop(), E({ type: "text", value: p }), o = i[i.length - 1];
              continue;
            }
            if (p === ou || p === au || p === Ja) {
              let b = p, v;
              for (t.keepQuotes !== true && (p = ""); f < d && (v = S()); ) {
                if (v === Mt) {
                  p += v + S();
                  continue;
                }
                if (v === b) {
                  t.keepQuotes === true && (p += v);
                  break;
                }
                p += v;
              }
              E({ type: "text", value: p });
              continue;
            }
            if (p === su) {
              g++;
              let v = { type: "brace", open: true, close: false, dollar: a.value && a.value.slice(-1) === "$" || o.dollar === true, depth: g, commas: 0, ranges: 0, nodes: [] };
              o = E(v), i.push(o), E({ type: "open", value: p });
              continue;
            }
            if (p === iu) {
              if (o.type !== "brace") {
                E({ type: "text", value: p });
                continue;
              }
              let b = "close";
              o = i.pop(), o.close = true, E({ type: b, value: p }), g--, o = i[i.length - 1];
              continue;
            }
            if (p === eu && g > 0) {
              if (o.ranges > 0) {
                o.ranges = 0;
                let b = o.nodes.shift();
                o.nodes = [b, { type: "text", value: za(o) }];
              }
              E({ type: "comma", value: p }), o.commas++;
              continue;
            }
            if (p === tu && g > 0 && o.commas === 0) {
              let b = o.nodes;
              if (g === 0 || b.length === 0) {
                E({ type: "text", value: p });
                continue;
              }
              if (a.type === "dot") {
                if (o.range = [], a.value += p, a.type = "range", o.nodes.length !== 3 && o.nodes.length !== 5) {
                  o.invalid = true, o.ranges = 0, a.type = "text";
                  continue;
                }
                o.ranges++, o.args = [];
                continue;
              }
              if (a.type === "range") {
                b.pop();
                let v = b[b.length - 1];
                v.value += a.value + p, a = v, o.ranges--;
                continue;
              }
              E({ type: "dot", value: p });
              continue;
            }
            E({ type: "text", value: p });
          }
        do
          if (o = i.pop(), o.type !== "root") {
            o.nodes.forEach((k) => {
              k.nodes || (k.type === "open" && (k.isOpen = true), k.type === "close" && (k.isClose = true), k.nodes || (k.type = "text"), k.invalid = true);
            });
            let b = i[i.length - 1], v = b.nodes.indexOf(o);
            b.nodes.splice(v, 1, ...o.nodes);
          }
        while (i.length > 0);
        return E({ type: "eos" }), s;
      };
      Rs.exports = lu;
    });
    var Ps = y((cp, xs) => {
      "use strict";
      var vs = et(), fu = hs(), pu = gs(), hu = bs(), Q = (e, t = {}) => {
        let r = [];
        if (Array.isArray(e))
          for (let n of e) {
            let s = Q.create(n, t);
            Array.isArray(s) ? r.push(...s) : r.push(s);
          }
        else
          r = [].concat(Q.create(e, t));
        return t && t.expand === true && t.nodupes === true && (r = [...new Set(r)]), r;
      };
      Q.parse = (e, t = {}) => hu(e, t);
      Q.stringify = (e, t = {}) => vs(typeof e == "string" ? Q.parse(e, t) : e, t);
      Q.compile = (e, t = {}) => (typeof e == "string" && (e = Q.parse(e, t)), fu(e, t));
      Q.expand = (e, t = {}) => {
        typeof e == "string" && (e = Q.parse(e, t));
        let r = pu(e, t);
        return t.noempty === true && (r = r.filter(Boolean)), t.nodupes === true && (r = [...new Set(r)]), r;
      };
      Q.create = (e, t = {}) => e === "" || e.length < 3 ? [e] : t.expand !== true ? Q.compile(e, t) : Q.expand(e, t);
      xs.exports = Q;
    });
    var qe = y((lp, Ls) => {
      "use strict";
      var du = require("path"), se = "\\\\/", ws = `[^${se}]`, ue = "\\.", _u = "\\+", gu = "\\?", rt = "\\/", yu = "(?=.)", Cs = "[^/]", Ft = `(?:${rt}|$)`, Ts = `(?:^|${rt})`, qt = `${ue}{1,2}${Ft}`, Su = `(?!${ue})`, mu = `(?!${Ts}${qt})`, Eu = `(?!${ue}{0,1}${Ft})`, Au = `(?!${qt})`, Ru = `[^.${rt}]`, bu = `${Cs}*?`, Os = { DOT_LITERAL: ue, PLUS_LITERAL: _u, QMARK_LITERAL: gu, SLASH_LITERAL: rt, ONE_CHAR: yu, QMARK: Cs, END_ANCHOR: Ft, DOTS_SLASH: qt, NO_DOT: Su, NO_DOTS: mu, NO_DOT_SLASH: Eu, NO_DOTS_SLASH: Au, QMARK_NO_DOT: Ru, STAR: bu, START_ANCHOR: Ts }, vu = { ...Os, SLASH_LITERAL: `[${se}]`, QMARK: ws, STAR: `${ws}*?`, DOTS_SLASH: `${ue}{1,2}(?:[${se}]|$)`, NO_DOT: `(?!${ue})`, NO_DOTS: `(?!(?:^|[${se}])${ue}{1,2}(?:[${se}]|$))`, NO_DOT_SLASH: `(?!${ue}{0,1}(?:[${se}]|$))`, NO_DOTS_SLASH: `(?!${ue}{1,2}(?:[${se}]|$))`, QMARK_NO_DOT: `[^.${se}]`, START_ANCHOR: `(?:^|[${se}])`, END_ANCHOR: `(?:[${se}]|$)` }, xu = { alnum: "a-zA-Z0-9", alpha: "a-zA-Z", ascii: "\\x00-\\x7F", blank: " \\t", cntrl: "\\x00-\\x1F\\x7F", digit: "0-9", graph: "\\x21-\\x7E", lower: "a-z", print: "\\x20-\\x7E ", punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~", space: " \\t\\r\\n\\v\\f", upper: "A-Z", word: "A-Za-z0-9_", xdigit: "A-Fa-f0-9" };
      Ls.exports = { MAX_LENGTH: 1024 * 64, POSIX_REGEX_SOURCE: xu, REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g, REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/, REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/, REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g, REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g, REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g, REPLACEMENTS: { "***": "*", "**/**": "**", "**/**/**": "**" }, CHAR_0: 48, CHAR_9: 57, CHAR_UPPERCASE_A: 65, CHAR_LOWERCASE_A: 97, CHAR_UPPERCASE_Z: 90, CHAR_LOWERCASE_Z: 122, CHAR_LEFT_PARENTHESES: 40, CHAR_RIGHT_PARENTHESES: 41, CHAR_ASTERISK: 42, CHAR_AMPERSAND: 38, CHAR_AT: 64, CHAR_BACKWARD_SLASH: 92, CHAR_CARRIAGE_RETURN: 13, CHAR_CIRCUMFLEX_ACCENT: 94, CHAR_COLON: 58, CHAR_COMMA: 44, CHAR_DOT: 46, CHAR_DOUBLE_QUOTE: 34, CHAR_EQUAL: 61, CHAR_EXCLAMATION_MARK: 33, CHAR_FORM_FEED: 12, CHAR_FORWARD_SLASH: 47, CHAR_GRAVE_ACCENT: 96, CHAR_HASH: 35, CHAR_HYPHEN_MINUS: 45, CHAR_LEFT_ANGLE_BRACKET: 60, CHAR_LEFT_CURLY_BRACE: 123, CHAR_LEFT_SQUARE_BRACKET: 91, CHAR_LINE_FEED: 10, CHAR_NO_BREAK_SPACE: 160, CHAR_PERCENT: 37, CHAR_PLUS: 43, CHAR_QUESTION_MARK: 63, CHAR_RIGHT_ANGLE_BRACKET: 62, CHAR_RIGHT_CURLY_BRACE: 125, CHAR_RIGHT_SQUARE_BRACKET: 93, CHAR_SEMICOLON: 59, CHAR_SINGLE_QUOTE: 39, CHAR_SPACE: 32, CHAR_TAB: 9, CHAR_UNDERSCORE: 95, CHAR_VERTICAL_LINE: 124, CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279, SEP: du.sep, extglobChars(e) {
        return { "!": { type: "negate", open: "(?:(?!(?:", close: `))${e.STAR})` }, "?": { type: "qmark", open: "(?:", close: ")?" }, "+": { type: "plus", open: "(?:", close: ")+" }, "*": { type: "star", open: "(?:", close: ")*" }, "@": { type: "at", open: "(?:", close: ")" } };
      }, globChars(e) {
        return e === true ? vu : Os;
      } };
    });
    var Be = y((K) => {
      "use strict";
      var Pu = require("path"), wu = process.platform === "win32", { REGEX_BACKSLASH: Cu, REGEX_REMOVE_BACKSLASH: Tu, REGEX_SPECIAL_CHARS: Ou, REGEX_SPECIAL_CHARS_GLOBAL: Lu } = qe();
      K.isObject = (e) => e !== null && typeof e == "object" && !Array.isArray(e);
      K.hasRegexChars = (e) => Ou.test(e);
      K.isRegexChar = (e) => e.length === 1 && K.hasRegexChars(e);
      K.escapeRegex = (e) => e.replace(Lu, "\\$1");
      K.toPosixSlashes = (e) => e.replace(Cu, "/");
      K.removeBackslashes = (e) => e.replace(Tu, (t) => t === "\\" ? "" : t);
      K.supportsLookbehinds = () => {
        let e = process.version.slice(1).split(".").map(Number);
        return e.length === 3 && e[0] >= 9 || e[0] === 8 && e[1] >= 10;
      };
      K.isWindows = (e) => e && typeof e.windows == "boolean" ? e.windows : wu === true || Pu.sep === "\\";
      K.escapeLast = (e, t, r) => {
        let n = e.lastIndexOf(t, r);
        return n === -1 ? e : e[n - 1] === "\\" ? K.escapeLast(e, t, n - 1) : `${e.slice(0, n)}\\${e.slice(n)}`;
      };
      K.removePrefix = (e, t = {}) => {
        let r = e;
        return r.startsWith("./") && (r = r.slice(2), t.prefix = "./"), r;
      };
      K.wrapOutput = (e, t = {}, r = {}) => {
        let n = r.contains ? "" : "^", s = r.contains ? "" : "$", i = `${n}(?:${e})${s}`;
        return t.negated === true && (i = `(?:^(?!${i}).*$)`), i;
      };
    });
    var Fs = y((pp, Ms) => {
      "use strict";
      var ks = Be(), { CHAR_ASTERISK: Bt, CHAR_AT: ku, CHAR_BACKWARD_SLASH: Ge, CHAR_COMMA: $u, CHAR_DOT: Gt, CHAR_EXCLAMATION_MARK: jt, CHAR_FORWARD_SLASH: Ns, CHAR_LEFT_CURLY_BRACE: Ut, CHAR_LEFT_PARENTHESES: Wt, CHAR_LEFT_SQUARE_BRACKET: Hu, CHAR_PLUS: Iu, CHAR_QUESTION_MARK: $s, CHAR_RIGHT_CURLY_BRACE: Du, CHAR_RIGHT_PARENTHESES: Hs, CHAR_RIGHT_SQUARE_BRACKET: Nu } = qe(), Is = (e) => e === Ns || e === Ge, Ds = (e) => {
        e.isPrefix !== true && (e.depth = e.isGlobstar ? 1 / 0 : 1);
      }, Mu = (e, t) => {
        let r = t || {}, n = e.length - 1, s = r.parts === true || r.scanToEnd === true, i = [], o = [], a = [], u = e, d = -1, f = 0, g = 0, p = false, T = false, S = false, E = false, b = false, v = false, k = false, I = false, Z = false, w = false, D = 0, x, A, L = { value: "", depth: 0, isGlob: false }, G = () => d >= n, h = () => u.charCodeAt(d + 1), N = () => (x = A, u.charCodeAt(++d));
        for (; d < n; ) {
          A = N();
          let W;
          if (A === Ge) {
            k = L.backslashes = true, A = N(), A === Ut && (v = true);
            continue;
          }
          if (v === true || A === Ut) {
            for (D++; G() !== true && (A = N()); ) {
              if (A === Ge) {
                k = L.backslashes = true, N();
                continue;
              }
              if (A === Ut) {
                D++;
                continue;
              }
              if (v !== true && A === Gt && (A = N()) === Gt) {
                if (p = L.isBrace = true, S = L.isGlob = true, w = true, s === true)
                  continue;
                break;
              }
              if (v !== true && A === $u) {
                if (p = L.isBrace = true, S = L.isGlob = true, w = true, s === true)
                  continue;
                break;
              }
              if (A === Du && (D--, D === 0)) {
                v = false, p = L.isBrace = true, w = true;
                break;
              }
            }
            if (s === true)
              continue;
            break;
          }
          if (A === Ns) {
            if (i.push(d), o.push(L), L = { value: "", depth: 0, isGlob: false }, w === true)
              continue;
            if (x === Gt && d === f + 1) {
              f += 2;
              continue;
            }
            g = d + 1;
            continue;
          }
          if (r.noext !== true && (A === Iu || A === ku || A === Bt || A === $s || A === jt) === true && h() === Wt) {
            if (S = L.isGlob = true, E = L.isExtglob = true, w = true, A === jt && d === f && (Z = true), s === true) {
              for (; G() !== true && (A = N()); ) {
                if (A === Ge) {
                  k = L.backslashes = true, A = N();
                  continue;
                }
                if (A === Hs) {
                  S = L.isGlob = true, w = true;
                  break;
                }
              }
              continue;
            }
            break;
          }
          if (A === Bt) {
            if (x === Bt && (b = L.isGlobstar = true), S = L.isGlob = true, w = true, s === true)
              continue;
            break;
          }
          if (A === $s) {
            if (S = L.isGlob = true, w = true, s === true)
              continue;
            break;
          }
          if (A === Hu) {
            for (; G() !== true && (W = N()); ) {
              if (W === Ge) {
                k = L.backslashes = true, N();
                continue;
              }
              if (W === Nu) {
                T = L.isBracket = true, S = L.isGlob = true, w = true;
                break;
              }
            }
            if (s === true)
              continue;
            break;
          }
          if (r.nonegate !== true && A === jt && d === f) {
            I = L.negated = true, f++;
            continue;
          }
          if (r.noparen !== true && A === Wt) {
            if (S = L.isGlob = true, s === true) {
              for (; G() !== true && (A = N()); ) {
                if (A === Wt) {
                  k = L.backslashes = true, A = N();
                  continue;
                }
                if (A === Hs) {
                  w = true;
                  break;
                }
              }
              continue;
            }
            break;
          }
          if (S === true) {
            if (w = true, s === true)
              continue;
            break;
          }
        }
        r.noext === true && (E = false, S = false);
        let $ = u, pe = "", c = "";
        f > 0 && (pe = u.slice(0, f), u = u.slice(f), g -= f), $ && S === true && g > 0 ? ($ = u.slice(0, g), c = u.slice(g)) : S === true ? ($ = "", c = u) : $ = u, $ && $ !== "" && $ !== "/" && $ !== u && Is($.charCodeAt($.length - 1)) && ($ = $.slice(0, -1)), r.unescape === true && (c && (c = ks.removeBackslashes(c)), $ && k === true && ($ = ks.removeBackslashes($)));
        let l = { prefix: pe, input: e, start: f, base: $, glob: c, isBrace: p, isBracket: T, isGlob: S, isExtglob: E, isGlobstar: b, negated: I, negatedExtglob: Z };
        if (r.tokens === true && (l.maxDepth = 0, Is(A) || o.push(L), l.tokens = o), r.parts === true || r.tokens === true) {
          let W;
          for (let O = 0; O < i.length; O++) {
            let ee = W ? W + 1 : f, te = i[O], X = e.slice(ee, te);
            r.tokens && (O === 0 && f !== 0 ? (o[O].isPrefix = true, o[O].value = pe) : o[O].value = X, Ds(o[O]), l.maxDepth += o[O].depth), (O !== 0 || X !== "") && a.push(X), W = te;
          }
          if (W && W + 1 < e.length) {
            let O = e.slice(W + 1);
            a.push(O), r.tokens && (o[o.length - 1].value = O, Ds(o[o.length - 1]), l.maxDepth += o[o.length - 1].depth);
          }
          l.slashes = i, l.parts = a;
        }
        return l;
      };
      Ms.exports = Mu;
    });
    var Gs = y((hp, Bs) => {
      "use strict";
      var nt = qe(), Y = Be(), { MAX_LENGTH: st, POSIX_REGEX_SOURCE: Fu, REGEX_NON_SPECIAL_CHARS: qu, REGEX_SPECIAL_CHARS_BACKREF: Bu, REPLACEMENTS: qs } = nt, Gu = (e, t) => {
        if (typeof t.expandRange == "function")
          return t.expandRange(...e, t);
        e.sort();
        let r = `[${e.join("-")}]`;
        try {
          new RegExp(r);
        } catch {
          return e.map((s) => Y.escapeRegex(s)).join("..");
        }
        return r;
      }, Oe = (e, t) => `Missing ${e}: "${t}" - use "\\\\${t}" to match literal characters`, Vt = (e, t) => {
        if (typeof e != "string")
          throw new TypeError("Expected a string");
        e = qs[e] || e;
        let r = { ...t }, n = typeof r.maxLength == "number" ? Math.min(st, r.maxLength) : st, s = e.length;
        if (s > n)
          throw new SyntaxError(`Input length: ${s}, exceeds maximum allowed length: ${n}`);
        let i = { type: "bos", value: "", output: r.prepend || "" }, o = [i], a = r.capture ? "" : "?:", u = Y.isWindows(t), d = nt.globChars(u), f = nt.extglobChars(d), { DOT_LITERAL: g, PLUS_LITERAL: p, SLASH_LITERAL: T, ONE_CHAR: S, DOTS_SLASH: E, NO_DOT: b, NO_DOT_SLASH: v, NO_DOTS_SLASH: k, QMARK: I, QMARK_NO_DOT: Z, STAR: w, START_ANCHOR: D } = d, x = (m) => `(${a}(?:(?!${D}${m.dot ? E : g}).)*?)`, A = r.dot ? "" : b, L = r.dot ? I : Z, G = r.bash === true ? x(r) : w;
        r.capture && (G = `(${G})`), typeof r.noext == "boolean" && (r.noextglob = r.noext);
        let h = { input: e, index: -1, start: 0, dot: r.dot === true, consumed: "", output: "", prefix: "", backtrack: false, negated: false, brackets: 0, braces: 0, parens: 0, quotes: 0, globstar: false, tokens: o };
        e = Y.removePrefix(e, h), s = e.length;
        let N = [], $ = [], pe = [], c = i, l, W = () => h.index === s - 1, O = h.peek = (m = 1) => e[h.index + m], ee = h.advance = () => e[++h.index] || "", te = () => e.slice(h.index + 1), X = (m = "", H = 0) => {
          h.consumed += m, h.index += H;
        }, Ve = (m) => {
          h.output += m.output != null ? m.output : m.value, X(m.value);
        }, ea = () => {
          let m = 1;
          for (; O() === "!" && (O(2) !== "(" || O(3) === "?"); )
            ee(), h.start++, m++;
          return m % 2 === 0 ? false : (h.negated = true, h.start++, true);
        }, Ke = (m) => {
          h[m]++, pe.push(m);
        }, me = (m) => {
          h[m]--, pe.pop();
        }, C = (m) => {
          if (c.type === "globstar") {
            let H = h.braces > 0 && (m.type === "comma" || m.type === "brace"), _ = m.extglob === true || N.length && (m.type === "pipe" || m.type === "paren");
            m.type !== "slash" && m.type !== "paren" && !H && !_ && (h.output = h.output.slice(0, -c.output.length), c.type = "star", c.value = "*", c.output = G, h.output += c.output);
          }
          if (N.length && m.type !== "paren" && (N[N.length - 1].inner += m.value), (m.value || m.output) && Ve(m), c && c.type === "text" && m.type === "text") {
            c.value += m.value, c.output = (c.output || "") + m.value;
            return;
          }
          m.prev = c, o.push(m), c = m;
        }, Xe = (m, H) => {
          let _ = { ...f[H], conditions: 1, inner: "" };
          _.prev = c, _.parens = h.parens, _.output = h.output;
          let P = (r.capture ? "(" : "") + _.open;
          Ke("parens"), C({ type: m, value: H, output: h.output ? "" : S }), C({ type: "paren", extglob: true, value: ee(), output: P }), N.push(_);
        }, ta = (m) => {
          let H = m.close + (r.capture ? ")" : ""), _;
          if (m.type === "negate") {
            let P = G;
            if (m.inner && m.inner.length > 1 && m.inner.includes("/") && (P = x(r)), (P !== G || W() || /^\)+$/.test(te())) && (H = m.close = `)$))${P}`), m.inner.includes("*") && (_ = te()) && /^\.[^\\/.]+$/.test(_)) {
              let F = Vt(_, { ...t, fastpaths: false }).output;
              H = m.close = `)${F})${P})`;
            }
            m.prev.type === "bos" && (h.negatedExtglob = true);
          }
          C({ type: "paren", extglob: true, value: l, output: H }), me("parens");
        };
        if (r.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(e)) {
          let m = false, H = e.replace(Bu, (_, P, F, V, B, Ot) => V === "\\" ? (m = true, _) : V === "?" ? P ? P + V + (B ? I.repeat(B.length) : "") : Ot === 0 ? L + (B ? I.repeat(B.length) : "") : I.repeat(F.length) : V === "." ? g.repeat(F.length) : V === "*" ? P ? P + V + (B ? G : "") : G : P ? _ : `\\${_}`);
          return m === true && (r.unescape === true ? H = H.replace(/\\/g, "") : H = H.replace(/\\+/g, (_) => _.length % 2 === 0 ? "\\\\" : _ ? "\\" : "")), H === e && r.contains === true ? (h.output = e, h) : (h.output = Y.wrapOutput(H, h, t), h);
        }
        for (; !W(); ) {
          if (l = ee(), l === "\0")
            continue;
          if (l === "\\") {
            let _ = O();
            if (_ === "/" && r.bash !== true || _ === "." || _ === ";")
              continue;
            if (!_) {
              l += "\\", C({ type: "text", value: l });
              continue;
            }
            let P = /^\\+/.exec(te()), F = 0;
            if (P && P[0].length > 2 && (F = P[0].length, h.index += F, F % 2 !== 0 && (l += "\\")), r.unescape === true ? l = ee() : l += ee(), h.brackets === 0) {
              C({ type: "text", value: l });
              continue;
            }
          }
          if (h.brackets > 0 && (l !== "]" || c.value === "[" || c.value === "[^")) {
            if (r.posix !== false && l === ":") {
              let _ = c.value.slice(1);
              if (_.includes("[") && (c.posix = true, _.includes(":"))) {
                let P = c.value.lastIndexOf("["), F = c.value.slice(0, P), V = c.value.slice(P + 2), B = Fu[V];
                if (B) {
                  c.value = F + B, h.backtrack = true, ee(), !i.output && o.indexOf(c) === 1 && (i.output = S);
                  continue;
                }
              }
            }
            (l === "[" && O() !== ":" || l === "-" && O() === "]") && (l = `\\${l}`), l === "]" && (c.value === "[" || c.value === "[^") && (l = `\\${l}`), r.posix === true && l === "!" && c.value === "[" && (l = "^"), c.value += l, Ve({ value: l });
            continue;
          }
          if (h.quotes === 1 && l !== '"') {
            l = Y.escapeRegex(l), c.value += l, Ve({ value: l });
            continue;
          }
          if (l === '"') {
            h.quotes = h.quotes === 1 ? 0 : 1, r.keepQuotes === true && C({ type: "text", value: l });
            continue;
          }
          if (l === "(") {
            Ke("parens"), C({ type: "paren", value: l });
            continue;
          }
          if (l === ")") {
            if (h.parens === 0 && r.strictBrackets === true)
              throw new SyntaxError(Oe("opening", "("));
            let _ = N[N.length - 1];
            if (_ && h.parens === _.parens + 1) {
              ta(N.pop());
              continue;
            }
            C({ type: "paren", value: l, output: h.parens ? ")" : "\\)" }), me("parens");
            continue;
          }
          if (l === "[") {
            if (r.nobracket === true || !te().includes("]")) {
              if (r.nobracket !== true && r.strictBrackets === true)
                throw new SyntaxError(Oe("closing", "]"));
              l = `\\${l}`;
            } else
              Ke("brackets");
            C({ type: "bracket", value: l });
            continue;
          }
          if (l === "]") {
            if (r.nobracket === true || c && c.type === "bracket" && c.value.length === 1) {
              C({ type: "text", value: l, output: `\\${l}` });
              continue;
            }
            if (h.brackets === 0) {
              if (r.strictBrackets === true)
                throw new SyntaxError(Oe("opening", "["));
              C({ type: "text", value: l, output: `\\${l}` });
              continue;
            }
            me("brackets");
            let _ = c.value.slice(1);
            if (c.posix !== true && _[0] === "^" && !_.includes("/") && (l = `/${l}`), c.value += l, Ve({ value: l }), r.literalBrackets === false || Y.hasRegexChars(_))
              continue;
            let P = Y.escapeRegex(c.value);
            if (h.output = h.output.slice(0, -c.value.length), r.literalBrackets === true) {
              h.output += P, c.value = P;
              continue;
            }
            c.value = `(${a}${P}|${c.value})`, h.output += c.value;
            continue;
          }
          if (l === "{" && r.nobrace !== true) {
            Ke("braces");
            let _ = { type: "brace", value: l, output: "(", outputIndex: h.output.length, tokensIndex: h.tokens.length };
            $.push(_), C(_);
            continue;
          }
          if (l === "}") {
            let _ = $[$.length - 1];
            if (r.nobrace === true || !_) {
              C({ type: "text", value: l, output: l });
              continue;
            }
            let P = ")";
            if (_.dots === true) {
              let F = o.slice(), V = [];
              for (let B = F.length - 1; B >= 0 && (o.pop(), F[B].type !== "brace"); B--)
                F[B].type !== "dots" && V.unshift(F[B].value);
              P = Gu(V, r), h.backtrack = true;
            }
            if (_.comma !== true && _.dots !== true) {
              let F = h.output.slice(0, _.outputIndex), V = h.tokens.slice(_.tokensIndex);
              _.value = _.output = "\\{", l = P = "\\}", h.output = F;
              for (let B of V)
                h.output += B.output || B.value;
            }
            C({ type: "brace", value: l, output: P }), me("braces"), $.pop();
            continue;
          }
          if (l === "|") {
            N.length > 0 && N[N.length - 1].conditions++, C({ type: "text", value: l });
            continue;
          }
          if (l === ",") {
            let _ = l, P = $[$.length - 1];
            P && pe[pe.length - 1] === "braces" && (P.comma = true, _ = "|"), C({ type: "comma", value: l, output: _ });
            continue;
          }
          if (l === "/") {
            if (c.type === "dot" && h.index === h.start + 1) {
              h.start = h.index + 1, h.consumed = "", h.output = "", o.pop(), c = i;
              continue;
            }
            C({ type: "slash", value: l, output: T });
            continue;
          }
          if (l === ".") {
            if (h.braces > 0 && c.type === "dot") {
              c.value === "." && (c.output = g);
              let _ = $[$.length - 1];
              c.type = "dots", c.output += l, c.value += l, _.dots = true;
              continue;
            }
            if (h.braces + h.parens === 0 && c.type !== "bos" && c.type !== "slash") {
              C({ type: "text", value: l, output: g });
              continue;
            }
            C({ type: "dot", value: l, output: g });
            continue;
          }
          if (l === "?") {
            if (!(c && c.value === "(") && r.noextglob !== true && O() === "(" && O(2) !== "?") {
              Xe("qmark", l);
              continue;
            }
            if (c && c.type === "paren") {
              let P = O(), F = l;
              if (P === "<" && !Y.supportsLookbehinds())
                throw new Error("Node.js v10 or higher is required for regex lookbehinds");
              (c.value === "(" && !/[!=<:]/.test(P) || P === "<" && !/<([!=]|\w+>)/.test(te())) && (F = `\\${l}`), C({ type: "text", value: l, output: F });
              continue;
            }
            if (r.dot !== true && (c.type === "slash" || c.type === "bos")) {
              C({ type: "qmark", value: l, output: Z });
              continue;
            }
            C({ type: "qmark", value: l, output: I });
            continue;
          }
          if (l === "!") {
            if (r.noextglob !== true && O() === "(" && (O(2) !== "?" || !/[!=<:]/.test(O(3)))) {
              Xe("negate", l);
              continue;
            }
            if (r.nonegate !== true && h.index === 0) {
              ea();
              continue;
            }
          }
          if (l === "+") {
            if (r.noextglob !== true && O() === "(" && O(2) !== "?") {
              Xe("plus", l);
              continue;
            }
            if (c && c.value === "(" || r.regex === false) {
              C({ type: "plus", value: l, output: p });
              continue;
            }
            if (c && (c.type === "bracket" || c.type === "paren" || c.type === "brace") || h.parens > 0) {
              C({ type: "plus", value: l });
              continue;
            }
            C({ type: "plus", value: p });
            continue;
          }
          if (l === "@") {
            if (r.noextglob !== true && O() === "(" && O(2) !== "?") {
              C({ type: "at", extglob: true, value: l, output: "" });
              continue;
            }
            C({ type: "text", value: l });
            continue;
          }
          if (l !== "*") {
            (l === "$" || l === "^") && (l = `\\${l}`);
            let _ = qu.exec(te());
            _ && (l += _[0], h.index += _[0].length), C({ type: "text", value: l });
            continue;
          }
          if (c && (c.type === "globstar" || c.star === true)) {
            c.type = "star", c.star = true, c.value += l, c.output = G, h.backtrack = true, h.globstar = true, X(l);
            continue;
          }
          let m = te();
          if (r.noextglob !== true && /^\([^?]/.test(m)) {
            Xe("star", l);
            continue;
          }
          if (c.type === "star") {
            if (r.noglobstar === true) {
              X(l);
              continue;
            }
            let _ = c.prev, P = _.prev, F = _.type === "slash" || _.type === "bos", V = P && (P.type === "star" || P.type === "globstar");
            if (r.bash === true && (!F || m[0] && m[0] !== "/")) {
              C({ type: "star", value: l, output: "" });
              continue;
            }
            let B = h.braces > 0 && (_.type === "comma" || _.type === "brace"), Ot = N.length && (_.type === "pipe" || _.type === "paren");
            if (!F && _.type !== "paren" && !B && !Ot) {
              C({ type: "star", value: l, output: "" });
              continue;
            }
            for (; m.slice(0, 3) === "/**"; ) {
              let Qe = e[h.index + 4];
              if (Qe && Qe !== "/")
                break;
              m = m.slice(3), X("/**", 3);
            }
            if (_.type === "bos" && W()) {
              c.type = "globstar", c.value += l, c.output = x(r), h.output = c.output, h.globstar = true, X(l);
              continue;
            }
            if (_.type === "slash" && _.prev.type !== "bos" && !V && W()) {
              h.output = h.output.slice(0, -(_.output + c.output).length), _.output = `(?:${_.output}`, c.type = "globstar", c.output = x(r) + (r.strictSlashes ? ")" : "|$)"), c.value += l, h.globstar = true, h.output += _.output + c.output, X(l);
              continue;
            }
            if (_.type === "slash" && _.prev.type !== "bos" && m[0] === "/") {
              let Qe = m[1] !== void 0 ? "|$" : "";
              h.output = h.output.slice(0, -(_.output + c.output).length), _.output = `(?:${_.output}`, c.type = "globstar", c.output = `${x(r)}${T}|${T}${Qe})`, c.value += l, h.output += _.output + c.output, h.globstar = true, X(l + ee()), C({ type: "slash", value: "/", output: "" });
              continue;
            }
            if (_.type === "bos" && m[0] === "/") {
              c.type = "globstar", c.value += l, c.output = `(?:^|${T}|${x(r)}${T})`, h.output = c.output, h.globstar = true, X(l + ee()), C({ type: "slash", value: "/", output: "" });
              continue;
            }
            h.output = h.output.slice(0, -c.output.length), c.type = "globstar", c.output = x(r), c.value += l, h.output += c.output, h.globstar = true, X(l);
            continue;
          }
          let H = { type: "star", value: l, output: G };
          if (r.bash === true) {
            H.output = ".*?", (c.type === "bos" || c.type === "slash") && (H.output = A + H.output), C(H);
            continue;
          }
          if (c && (c.type === "bracket" || c.type === "paren") && r.regex === true) {
            H.output = l, C(H);
            continue;
          }
          (h.index === h.start || c.type === "slash" || c.type === "dot") && (c.type === "dot" ? (h.output += v, c.output += v) : r.dot === true ? (h.output += k, c.output += k) : (h.output += A, c.output += A), O() !== "*" && (h.output += S, c.output += S)), C(H);
        }
        for (; h.brackets > 0; ) {
          if (r.strictBrackets === true)
            throw new SyntaxError(Oe("closing", "]"));
          h.output = Y.escapeLast(h.output, "["), me("brackets");
        }
        for (; h.parens > 0; ) {
          if (r.strictBrackets === true)
            throw new SyntaxError(Oe("closing", ")"));
          h.output = Y.escapeLast(h.output, "("), me("parens");
        }
        for (; h.braces > 0; ) {
          if (r.strictBrackets === true)
            throw new SyntaxError(Oe("closing", "}"));
          h.output = Y.escapeLast(h.output, "{"), me("braces");
        }
        if (r.strictSlashes !== true && (c.type === "star" || c.type === "bracket") && C({ type: "maybe_slash", value: "", output: `${T}?` }), h.backtrack === true) {
          h.output = "";
          for (let m of h.tokens)
            h.output += m.output != null ? m.output : m.value, m.suffix && (h.output += m.suffix);
        }
        return h;
      };
      Vt.fastpaths = (e, t) => {
        let r = { ...t }, n = typeof r.maxLength == "number" ? Math.min(st, r.maxLength) : st, s = e.length;
        if (s > n)
          throw new SyntaxError(`Input length: ${s}, exceeds maximum allowed length: ${n}`);
        e = qs[e] || e;
        let i = Y.isWindows(t), { DOT_LITERAL: o, SLASH_LITERAL: a, ONE_CHAR: u, DOTS_SLASH: d, NO_DOT: f, NO_DOTS: g, NO_DOTS_SLASH: p, STAR: T, START_ANCHOR: S } = nt.globChars(i), E = r.dot ? g : f, b = r.dot ? p : f, v = r.capture ? "" : "?:", k = { negated: false, prefix: "" }, I = r.bash === true ? ".*?" : T;
        r.capture && (I = `(${I})`);
        let Z = (A) => A.noglobstar === true ? I : `(${v}(?:(?!${S}${A.dot ? d : o}).)*?)`, w = (A) => {
          switch (A) {
            case "*":
              return `${E}${u}${I}`;
            case ".*":
              return `${o}${u}${I}`;
            case "*.*":
              return `${E}${I}${o}${u}${I}`;
            case "*/*":
              return `${E}${I}${a}${u}${b}${I}`;
            case "**":
              return E + Z(r);
            case "**/*":
              return `(?:${E}${Z(r)}${a})?${b}${u}${I}`;
            case "**/*.*":
              return `(?:${E}${Z(r)}${a})?${b}${I}${o}${u}${I}`;
            case "**/.*":
              return `(?:${E}${Z(r)}${a})?${o}${u}${I}`;
            default: {
              let L = /^(.*?)\.(\w+)$/.exec(A);
              if (!L)
                return;
              let G = w(L[1]);
              return G ? G + o + L[2] : void 0;
            }
          }
        }, D = Y.removePrefix(e, k), x = w(D);
        return x && r.strictSlashes !== true && (x += `${a}?`), x;
      };
      Bs.exports = Vt;
    });
    var Us = y((dp, js) => {
      "use strict";
      var ju = require("path"), Uu = Fs(), Kt = Gs(), Xt = Be(), Wu = qe(), Vu = (e) => e && typeof e == "object" && !Array.isArray(e), q = (e, t, r = false) => {
        if (Array.isArray(e)) {
          let f = e.map((p) => q(p, t, r));
          return (p) => {
            for (let T of f) {
              let S = T(p);
              if (S)
                return S;
            }
            return false;
          };
        }
        let n = Vu(e) && e.tokens && e.input;
        if (e === "" || typeof e != "string" && !n)
          throw new TypeError("Expected pattern to be a non-empty string");
        let s = t || {}, i = Xt.isWindows(t), o = n ? q.compileRe(e, t) : q.makeRe(e, t, false, true), a = o.state;
        delete o.state;
        let u = () => false;
        if (s.ignore) {
          let f = { ...t, ignore: null, onMatch: null, onResult: null };
          u = q(s.ignore, f, r);
        }
        let d = (f, g = false) => {
          let { isMatch: p, match: T, output: S } = q.test(f, o, t, { glob: e, posix: i }), E = { glob: e, state: a, regex: o, posix: i, input: f, output: S, match: T, isMatch: p };
          return typeof s.onResult == "function" && s.onResult(E), p === false ? (E.isMatch = false, g ? E : false) : u(f) ? (typeof s.onIgnore == "function" && s.onIgnore(E), E.isMatch = false, g ? E : false) : (typeof s.onMatch == "function" && s.onMatch(E), g ? E : true);
        };
        return r && (d.state = a), d;
      };
      q.test = (e, t, r, { glob: n, posix: s } = {}) => {
        if (typeof e != "string")
          throw new TypeError("Expected input to be a string");
        if (e === "")
          return { isMatch: false, output: "" };
        let i = r || {}, o = i.format || (s ? Xt.toPosixSlashes : null), a = e === n, u = a && o ? o(e) : e;
        return a === false && (u = o ? o(e) : e, a = u === n), (a === false || i.capture === true) && (i.matchBase === true || i.basename === true ? a = q.matchBase(e, t, r, s) : a = t.exec(u)), { isMatch: Boolean(a), match: a, output: u };
      };
      q.matchBase = (e, t, r, n = Xt.isWindows(r)) => (t instanceof RegExp ? t : q.makeRe(t, r)).test(ju.basename(e));
      q.isMatch = (e, t, r) => q(t, r)(e);
      q.parse = (e, t) => Array.isArray(e) ? e.map((r) => q.parse(r, t)) : Kt(e, { ...t, fastpaths: false });
      q.scan = (e, t) => Uu(e, t);
      q.compileRe = (e, t, r = false, n = false) => {
        if (r === true)
          return e.output;
        let s = t || {}, i = s.contains ? "" : "^", o = s.contains ? "" : "$", a = `${i}(?:${e.output})${o}`;
        e && e.negated === true && (a = `^(?!${a}).*$`);
        let u = q.toRegex(a, t);
        return n === true && (u.state = e), u;
      };
      q.makeRe = (e, t = {}, r = false, n = false) => {
        if (!e || typeof e != "string")
          throw new TypeError("Expected a non-empty string");
        let s = { negated: false, fastpaths: true };
        return t.fastpaths !== false && (e[0] === "." || e[0] === "*") && (s.output = Kt.fastpaths(e, t)), s.output || (s = Kt(e, t)), q.compileRe(s, t, r, n);
      };
      q.toRegex = (e, t) => {
        try {
          let r = t || {};
          return new RegExp(e, r.flags || (r.nocase ? "i" : ""));
        } catch (r) {
          if (t && t.debug === true)
            throw r;
          return /$^/;
        }
      };
      q.constants = Wu;
      js.exports = q;
    });
    var Vs = y((_p, Ws) => {
      "use strict";
      Ws.exports = Us();
    });
    var Zs = y((gp, Ys) => {
      "use strict";
      var Xs = require("util"), Qs = Ps(), ie = Vs(), Qt = Be(), Ks = (e) => e === "" || e === "./", M = (e, t, r) => {
        t = [].concat(t), e = [].concat(e);
        let n = /* @__PURE__ */ new Set(), s = /* @__PURE__ */ new Set(), i = /* @__PURE__ */ new Set(), o = 0, a = (f) => {
          i.add(f.output), r && r.onResult && r.onResult(f);
        };
        for (let f = 0; f < t.length; f++) {
          let g = ie(String(t[f]), { ...r, onResult: a }, true), p = g.state.negated || g.state.negatedExtglob;
          p && o++;
          for (let T of e) {
            let S = g(T, true);
            (p ? !S.isMatch : S.isMatch) && (p ? n.add(S.output) : (n.delete(S.output), s.add(S.output)));
          }
        }
        let d = (o === t.length ? [...i] : [...s]).filter((f) => !n.has(f));
        if (r && d.length === 0) {
          if (r.failglob === true)
            throw new Error(`No matches found for "${t.join(", ")}"`);
          if (r.nonull === true || r.nullglob === true)
            return r.unescape ? t.map((f) => f.replace(/\\/g, "")) : t;
        }
        return d;
      };
      M.match = M;
      M.matcher = (e, t) => ie(e, t);
      M.isMatch = (e, t, r) => ie(t, r)(e);
      M.any = M.isMatch;
      M.not = (e, t, r = {}) => {
        t = [].concat(t).map(String);
        let n = /* @__PURE__ */ new Set(), s = [], i = (a) => {
          r.onResult && r.onResult(a), s.push(a.output);
        }, o = new Set(M(e, t, { ...r, onResult: i }));
        for (let a of s)
          o.has(a) || n.add(a);
        return [...n];
      };
      M.contains = (e, t, r) => {
        if (typeof e != "string")
          throw new TypeError(`Expected a string: "${Xs.inspect(e)}"`);
        if (Array.isArray(t))
          return t.some((n) => M.contains(e, n, r));
        if (typeof t == "string") {
          if (Ks(e) || Ks(t))
            return false;
          if (e.includes(t) || e.startsWith("./") && e.slice(2).includes(t))
            return true;
        }
        return M.isMatch(e, t, { ...r, contains: true });
      };
      M.matchKeys = (e, t, r) => {
        if (!Qt.isObject(e))
          throw new TypeError("Expected the first argument to be an object");
        let n = M(Object.keys(e), t, r), s = {};
        for (let i of n)
          s[i] = e[i];
        return s;
      };
      M.some = (e, t, r) => {
        let n = [].concat(e);
        for (let s of [].concat(t)) {
          let i = ie(String(s), r);
          if (n.some((o) => i(o)))
            return true;
        }
        return false;
      };
      M.every = (e, t, r) => {
        let n = [].concat(e);
        for (let s of [].concat(t)) {
          let i = ie(String(s), r);
          if (!n.every((o) => i(o)))
            return false;
        }
        return true;
      };
      M.all = (e, t, r) => {
        if (typeof e != "string")
          throw new TypeError(`Expected a string: "${Xs.inspect(e)}"`);
        return [].concat(t).every((n) => ie(n, r)(e));
      };
      M.capture = (e, t, r) => {
        let n = Qt.isWindows(r), i = ie.makeRe(String(e), { ...r, capture: true }).exec(n ? Qt.toPosixSlashes(t) : t);
        if (i)
          return i.slice(1).map((o) => o === void 0 ? "" : o);
      };
      M.makeRe = (...e) => ie.makeRe(...e);
      M.scan = (...e) => ie.scan(...e);
      M.parse = (e, t) => {
        let r = [];
        for (let n of [].concat(e || []))
          for (let s of Qs(String(n), t))
            r.push(ie.parse(s, t));
        return r;
      };
      M.braces = (e, t) => {
        if (typeof e != "string")
          throw new TypeError("Expected a string");
        return t && t.nobrace === true || !/\{.*\}/.test(e) ? [e] : Qs(e, t);
      };
      M.braceExpand = (e, t) => {
        if (typeof e != "string")
          throw new TypeError("Expected a string");
        return M.braces(e, { ...t, expand: true });
      };
      Ys.exports = M;
    });
    var ii = y((R) => {
      "use strict";
      Object.defineProperty(R, "__esModule", { value: true });
      R.matchAny = R.convertPatternsToRe = R.makeRe = R.getPatternParts = R.expandBraceExpansion = R.expandPatternsWithBraceExpansion = R.isAffectDepthOfReadingPattern = R.endsWithSlashGlobStar = R.hasGlobStar = R.getBaseDirectory = R.isPatternRelatedToParentDirectory = R.getPatternsOutsideCurrentDirectory = R.getPatternsInsideCurrentDirectory = R.getPositivePatterns = R.getNegativePatterns = R.isPositivePattern = R.isNegativePattern = R.convertToNegativePattern = R.convertToPositivePattern = R.isDynamicPattern = R.isStaticPattern = void 0;
      var Ku = require("path"), Xu = jn(), Yt = Zs(), zs = "**", Qu = "\\", Yu = /[*?]|^!/, Zu = /\[[^[]*]/, zu = /(?:^|[^!*+?@])\([^(]*\|[^|]*\)/, Ju = /[!*+?@]\([^(]*\)/, ec = /,|\.\./;
      function Js(e, t = {}) {
        return !ei(e, t);
      }
      R.isStaticPattern = Js;
      function ei(e, t = {}) {
        return e === "" ? false : !!(t.caseSensitiveMatch === false || e.includes(Qu) || Yu.test(e) || Zu.test(e) || zu.test(e) || t.extglob !== false && Ju.test(e) || t.braceExpansion !== false && tc(e));
      }
      R.isDynamicPattern = ei;
      function tc(e) {
        let t = e.indexOf("{");
        if (t === -1)
          return false;
        let r = e.indexOf("}", t + 1);
        if (r === -1)
          return false;
        let n = e.slice(t, r);
        return ec.test(n);
      }
      function rc(e) {
        return it(e) ? e.slice(1) : e;
      }
      R.convertToPositivePattern = rc;
      function nc(e) {
        return "!" + e;
      }
      R.convertToNegativePattern = nc;
      function it(e) {
        return e.startsWith("!") && e[1] !== "(";
      }
      R.isNegativePattern = it;
      function ti(e) {
        return !it(e);
      }
      R.isPositivePattern = ti;
      function sc(e) {
        return e.filter(it);
      }
      R.getNegativePatterns = sc;
      function ic(e) {
        return e.filter(ti);
      }
      R.getPositivePatterns = ic;
      function oc(e) {
        return e.filter((t) => !Zt(t));
      }
      R.getPatternsInsideCurrentDirectory = oc;
      function ac(e) {
        return e.filter(Zt);
      }
      R.getPatternsOutsideCurrentDirectory = ac;
      function Zt(e) {
        return e.startsWith("..") || e.startsWith("./..");
      }
      R.isPatternRelatedToParentDirectory = Zt;
      function uc(e) {
        return Xu(e, { flipBackslashes: false });
      }
      R.getBaseDirectory = uc;
      function cc(e) {
        return e.includes(zs);
      }
      R.hasGlobStar = cc;
      function ri(e) {
        return e.endsWith("/" + zs);
      }
      R.endsWithSlashGlobStar = ri;
      function lc(e) {
        let t = Ku.basename(e);
        return ri(e) || Js(t);
      }
      R.isAffectDepthOfReadingPattern = lc;
      function fc(e) {
        return e.reduce((t, r) => t.concat(ni(r)), []);
      }
      R.expandPatternsWithBraceExpansion = fc;
      function ni(e) {
        return Yt.braces(e, { expand: true, nodupes: true });
      }
      R.expandBraceExpansion = ni;
      function pc(e, t) {
        let { parts: r } = Yt.scan(e, Object.assign(Object.assign({}, t), { parts: true }));
        return r.length === 0 && (r = [e]), r[0].startsWith("/") && (r[0] = r[0].slice(1), r.unshift("")), r;
      }
      R.getPatternParts = pc;
      function si(e, t) {
        return Yt.makeRe(e, t);
      }
      R.makeRe = si;
      function hc(e, t) {
        return e.map((r) => si(r, t));
      }
      R.convertPatternsToRe = hc;
      function dc(e, t) {
        return t.some((r) => r.test(e));
      }
      R.matchAny = dc;
    });
    var ai = y((ot) => {
      "use strict";
      Object.defineProperty(ot, "__esModule", { value: true });
      ot.merge = void 0;
      var _c = Lt();
      function gc(e) {
        let t = _c(e);
        return e.forEach((r) => {
          r.once("error", (n) => t.emit("error", n));
        }), t.once("close", () => oi(e)), t.once("end", () => oi(e)), t;
      }
      ot.merge = gc;
      function oi(e) {
        e.forEach((t) => t.emit("close"));
      }
    });
    var ui = y((Le) => {
      "use strict";
      Object.defineProperty(Le, "__esModule", { value: true });
      Le.isEmpty = Le.isString = void 0;
      function yc(e) {
        return typeof e == "string";
      }
      Le.isString = yc;
      function Sc(e) {
        return e === "";
      }
      Le.isEmpty = Sc;
    });
    var ce = y((j) => {
      "use strict";
      Object.defineProperty(j, "__esModule", { value: true });
      j.string = j.stream = j.pattern = j.path = j.fs = j.errno = j.array = void 0;
      var mc = $n();
      j.array = mc;
      var Ec = Hn();
      j.errno = Ec;
      var Ac = In();
      j.fs = Ac;
      var Rc = Dn();
      j.path = Rc;
      var bc = ii();
      j.pattern = bc;
      var vc = ai();
      j.stream = vc;
      var xc = ui();
      j.string = xc;
    });
    var fi = y((U) => {
      "use strict";
      Object.defineProperty(U, "__esModule", { value: true });
      U.convertPatternGroupToTask = U.convertPatternGroupsToTasks = U.groupPatternsByBaseDirectory = U.getNegativePatternsAsPositive = U.getPositivePatterns = U.convertPatternsToTasks = U.generate = void 0;
      var le = ce();
      function Pc(e, t) {
        let r = ci(e), n = li(e, t.ignore), s = r.filter((u) => le.pattern.isStaticPattern(u, t)), i = r.filter((u) => le.pattern.isDynamicPattern(u, t)), o = zt(s, n, false), a = zt(i, n, true);
        return o.concat(a);
      }
      U.generate = Pc;
      function zt(e, t, r) {
        let n = [], s = le.pattern.getPatternsOutsideCurrentDirectory(e), i = le.pattern.getPatternsInsideCurrentDirectory(e), o = Jt(s), a = Jt(i);
        return n.push(...er(o, t, r)), "." in a ? n.push(tr(".", i, t, r)) : n.push(...er(a, t, r)), n;
      }
      U.convertPatternsToTasks = zt;
      function ci(e) {
        return le.pattern.getPositivePatterns(e);
      }
      U.getPositivePatterns = ci;
      function li(e, t) {
        return le.pattern.getNegativePatterns(e).concat(t).map(le.pattern.convertToPositivePattern);
      }
      U.getNegativePatternsAsPositive = li;
      function Jt(e) {
        let t = {};
        return e.reduce((r, n) => {
          let s = le.pattern.getBaseDirectory(n);
          return s in r ? r[s].push(n) : r[s] = [n], r;
        }, t);
      }
      U.groupPatternsByBaseDirectory = Jt;
      function er(e, t, r) {
        return Object.keys(e).map((n) => tr(n, e[n], t, r));
      }
      U.convertPatternGroupsToTasks = er;
      function tr(e, t, r, n) {
        return { dynamic: n, positive: t, negative: r, base: e, patterns: [].concat(t, r.map(le.pattern.convertToNegativePattern)) };
      }
      U.convertPatternGroupToTask = tr;
    });
    var hi = y((ke) => {
      "use strict";
      Object.defineProperty(ke, "__esModule", { value: true });
      ke.removeDuplicateSlashes = ke.transform = void 0;
      var wc = /(?!^)\/{2,}/g;
      function Cc(e) {
        return e.map((t) => pi(t));
      }
      ke.transform = Cc;
      function pi(e) {
        return e.replace(wc, "/");
      }
      ke.removeDuplicateSlashes = pi;
    });
    var _i = y((at) => {
      "use strict";
      Object.defineProperty(at, "__esModule", { value: true });
      at.read = void 0;
      function Tc(e, t, r) {
        t.fs.lstat(e, (n, s) => {
          if (n !== null) {
            di(r, n);
            return;
          }
          if (!s.isSymbolicLink() || !t.followSymbolicLink) {
            rr(r, s);
            return;
          }
          t.fs.stat(e, (i, o) => {
            if (i !== null) {
              if (t.throwErrorOnBrokenSymbolicLink) {
                di(r, i);
                return;
              }
              rr(r, s);
              return;
            }
            t.markSymbolicLink && (o.isSymbolicLink = () => true), rr(r, o);
          });
        });
      }
      at.read = Tc;
      function di(e, t) {
        e(t);
      }
      function rr(e, t) {
        e(null, t);
      }
    });
    var gi = y((ut) => {
      "use strict";
      Object.defineProperty(ut, "__esModule", { value: true });
      ut.read = void 0;
      function Oc(e, t) {
        let r = t.fs.lstatSync(e);
        if (!r.isSymbolicLink() || !t.followSymbolicLink)
          return r;
        try {
          let n = t.fs.statSync(e);
          return t.markSymbolicLink && (n.isSymbolicLink = () => true), n;
        } catch (n) {
          if (!t.throwErrorOnBrokenSymbolicLink)
            return r;
          throw n;
        }
      }
      ut.read = Oc;
    });
    var yi = y((he) => {
      "use strict";
      Object.defineProperty(he, "__esModule", { value: true });
      he.createFileSystemAdapter = he.FILE_SYSTEM_ADAPTER = void 0;
      var ct = require("fs");
      he.FILE_SYSTEM_ADAPTER = { lstat: ct.lstat, stat: ct.stat, lstatSync: ct.lstatSync, statSync: ct.statSync };
      function Lc(e) {
        return e === void 0 ? he.FILE_SYSTEM_ADAPTER : Object.assign(Object.assign({}, he.FILE_SYSTEM_ADAPTER), e);
      }
      he.createFileSystemAdapter = Lc;
    });
    var Si = y((sr) => {
      "use strict";
      Object.defineProperty(sr, "__esModule", { value: true });
      var kc = yi(), nr = class {
        constructor(t = {}) {
          this._options = t, this.followSymbolicLink = this._getValue(this._options.followSymbolicLink, true), this.fs = kc.createFileSystemAdapter(this._options.fs), this.markSymbolicLink = this._getValue(this._options.markSymbolicLink, false), this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, true);
        }
        _getValue(t, r) {
          return t ?? r;
        }
      };
      sr.default = nr;
    });
    var Re = y((de) => {
      "use strict";
      Object.defineProperty(de, "__esModule", { value: true });
      de.statSync = de.stat = de.Settings = void 0;
      var mi = _i(), $c = gi(), ir = Si();
      de.Settings = ir.default;
      function Hc(e, t, r) {
        if (typeof t == "function") {
          mi.read(e, or(), t);
          return;
        }
        mi.read(e, or(t), r);
      }
      de.stat = Hc;
      function Ic(e, t) {
        let r = or(t);
        return $c.read(e, r);
      }
      de.statSync = Ic;
      function or(e = {}) {
        return e instanceof ir.default ? e : new ir.default(e);
      }
    });
    var Ri = y((Cp, Ai) => {
      var Ei;
      Ai.exports = typeof queueMicrotask == "function" ? queueMicrotask.bind(typeof window < "u" ? window : global) : (e) => (Ei || (Ei = Promise.resolve())).then(e).catch((t) => setTimeout(() => {
        throw t;
      }, 0));
    });
    var vi = y((Tp, bi) => {
      bi.exports = Nc;
      var Dc = Ri();
      function Nc(e, t) {
        let r, n, s, i = true;
        Array.isArray(e) ? (r = [], n = e.length) : (s = Object.keys(e), r = {}, n = s.length);
        function o(u) {
          function d() {
            t && t(u, r), t = null;
          }
          i ? Dc(d) : d();
        }
        function a(u, d, f) {
          r[u] = f, (--n === 0 || d) && o(d);
        }
        n ? s ? s.forEach(function(u) {
          e[u](function(d, f) {
            a(u, d, f);
          });
        }) : e.forEach(function(u, d) {
          u(function(f, g) {
            a(d, f, g);
          });
        }) : o(null), i = false;
      }
    });
    var ar = y((ft) => {
      "use strict";
      Object.defineProperty(ft, "__esModule", { value: true });
      ft.IS_SUPPORT_READDIR_WITH_FILE_TYPES = void 0;
      var lt = process.versions.node.split(".");
      if (lt[0] === void 0 || lt[1] === void 0)
        throw new Error(`Unexpected behavior. The 'process.versions.node' variable has invalid value: ${process.versions.node}`);
      var xi = Number.parseInt(lt[0], 10), Mc = Number.parseInt(lt[1], 10), Pi = 10, Fc = 10, qc = xi > Pi, Bc = xi === Pi && Mc >= Fc;
      ft.IS_SUPPORT_READDIR_WITH_FILE_TYPES = qc || Bc;
    });
    var wi = y((pt) => {
      "use strict";
      Object.defineProperty(pt, "__esModule", { value: true });
      pt.createDirentFromStats = void 0;
      var ur = class {
        constructor(t, r) {
          this.name = t, this.isBlockDevice = r.isBlockDevice.bind(r), this.isCharacterDevice = r.isCharacterDevice.bind(r), this.isDirectory = r.isDirectory.bind(r), this.isFIFO = r.isFIFO.bind(r), this.isFile = r.isFile.bind(r), this.isSocket = r.isSocket.bind(r), this.isSymbolicLink = r.isSymbolicLink.bind(r);
        }
      };
      function Gc(e, t) {
        return new ur(e, t);
      }
      pt.createDirentFromStats = Gc;
    });
    var cr = y((ht) => {
      "use strict";
      Object.defineProperty(ht, "__esModule", { value: true });
      ht.fs = void 0;
      var jc = wi();
      ht.fs = jc;
    });
    var lr = y((dt) => {
      "use strict";
      Object.defineProperty(dt, "__esModule", { value: true });
      dt.joinPathSegments = void 0;
      function Uc(e, t, r) {
        return e.endsWith(r) ? e + t : e + r + t;
      }
      dt.joinPathSegments = Uc;
    });
    var $i = y((_e) => {
      "use strict";
      Object.defineProperty(_e, "__esModule", { value: true });
      _e.readdir = _e.readdirWithFileTypes = _e.read = void 0;
      var Wc = Re(), Ci = vi(), Vc = ar(), Ti = cr(), Oi = lr();
      function Kc(e, t, r) {
        if (!t.stats && Vc.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
          Li(e, t, r);
          return;
        }
        ki(e, t, r);
      }
      _e.read = Kc;
      function Li(e, t, r) {
        t.fs.readdir(e, { withFileTypes: true }, (n, s) => {
          if (n !== null) {
            _t(r, n);
            return;
          }
          let i = s.map((a) => ({ dirent: a, name: a.name, path: Oi.joinPathSegments(e, a.name, t.pathSegmentSeparator) }));
          if (!t.followSymbolicLinks) {
            fr(r, i);
            return;
          }
          let o = i.map((a) => Xc(a, t));
          Ci(o, (a, u) => {
            if (a !== null) {
              _t(r, a);
              return;
            }
            fr(r, u);
          });
        });
      }
      _e.readdirWithFileTypes = Li;
      function Xc(e, t) {
        return (r) => {
          if (!e.dirent.isSymbolicLink()) {
            r(null, e);
            return;
          }
          t.fs.stat(e.path, (n, s) => {
            if (n !== null) {
              if (t.throwErrorOnBrokenSymbolicLink) {
                r(n);
                return;
              }
              r(null, e);
              return;
            }
            e.dirent = Ti.fs.createDirentFromStats(e.name, s), r(null, e);
          });
        };
      }
      function ki(e, t, r) {
        t.fs.readdir(e, (n, s) => {
          if (n !== null) {
            _t(r, n);
            return;
          }
          let i = s.map((o) => {
            let a = Oi.joinPathSegments(e, o, t.pathSegmentSeparator);
            return (u) => {
              Wc.stat(a, t.fsStatSettings, (d, f) => {
                if (d !== null) {
                  u(d);
                  return;
                }
                let g = { name: o, path: a, dirent: Ti.fs.createDirentFromStats(o, f) };
                t.stats && (g.stats = f), u(null, g);
              });
            };
          });
          Ci(i, (o, a) => {
            if (o !== null) {
              _t(r, o);
              return;
            }
            fr(r, a);
          });
        });
      }
      _e.readdir = ki;
      function _t(e, t) {
        e(t);
      }
      function fr(e, t) {
        e(null, t);
      }
    });
    var Mi = y((ge) => {
      "use strict";
      Object.defineProperty(ge, "__esModule", { value: true });
      ge.readdir = ge.readdirWithFileTypes = ge.read = void 0;
      var Qc = Re(), Yc = ar(), Hi = cr(), Ii = lr();
      function Zc(e, t) {
        return !t.stats && Yc.IS_SUPPORT_READDIR_WITH_FILE_TYPES ? Di(e, t) : Ni(e, t);
      }
      ge.read = Zc;
      function Di(e, t) {
        return t.fs.readdirSync(e, { withFileTypes: true }).map((n) => {
          let s = { dirent: n, name: n.name, path: Ii.joinPathSegments(e, n.name, t.pathSegmentSeparator) };
          if (s.dirent.isSymbolicLink() && t.followSymbolicLinks)
            try {
              let i = t.fs.statSync(s.path);
              s.dirent = Hi.fs.createDirentFromStats(s.name, i);
            } catch (i) {
              if (t.throwErrorOnBrokenSymbolicLink)
                throw i;
            }
          return s;
        });
      }
      ge.readdirWithFileTypes = Di;
      function Ni(e, t) {
        return t.fs.readdirSync(e).map((n) => {
          let s = Ii.joinPathSegments(e, n, t.pathSegmentSeparator), i = Qc.statSync(s, t.fsStatSettings), o = { name: n, path: s, dirent: Hi.fs.createDirentFromStats(n, i) };
          return t.stats && (o.stats = i), o;
        });
      }
      ge.readdir = Ni;
    });
    var Fi = y((ye) => {
      "use strict";
      Object.defineProperty(ye, "__esModule", { value: true });
      ye.createFileSystemAdapter = ye.FILE_SYSTEM_ADAPTER = void 0;
      var $e = require("fs");
      ye.FILE_SYSTEM_ADAPTER = { lstat: $e.lstat, stat: $e.stat, lstatSync: $e.lstatSync, statSync: $e.statSync, readdir: $e.readdir, readdirSync: $e.readdirSync };
      function zc(e) {
        return e === void 0 ? ye.FILE_SYSTEM_ADAPTER : Object.assign(Object.assign({}, ye.FILE_SYSTEM_ADAPTER), e);
      }
      ye.createFileSystemAdapter = zc;
    });
    var qi = y((hr) => {
      "use strict";
      Object.defineProperty(hr, "__esModule", { value: true });
      var Jc = require("path"), el = Re(), tl = Fi(), pr = class {
        constructor(t = {}) {
          this._options = t, this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, false), this.fs = tl.createFileSystemAdapter(this._options.fs), this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, Jc.sep), this.stats = this._getValue(this._options.stats, false), this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, true), this.fsStatSettings = new el.Settings({ followSymbolicLink: this.followSymbolicLinks, fs: this.fs, throwErrorOnBrokenSymbolicLink: this.throwErrorOnBrokenSymbolicLink });
        }
        _getValue(t, r) {
          return t ?? r;
        }
      };
      hr.default = pr;
    });
    var gt = y((Se) => {
      "use strict";
      Object.defineProperty(Se, "__esModule", { value: true });
      Se.Settings = Se.scandirSync = Se.scandir = void 0;
      var Bi = $i(), rl = Mi(), dr = qi();
      Se.Settings = dr.default;
      function nl(e, t, r) {
        if (typeof t == "function") {
          Bi.read(e, _r(), t);
          return;
        }
        Bi.read(e, _r(t), r);
      }
      Se.scandir = nl;
      function sl(e, t) {
        let r = _r(t);
        return rl.read(e, r);
      }
      Se.scandirSync = sl;
      function _r(e = {}) {
        return e instanceof dr.default ? e : new dr.default(e);
      }
    });
    var ji = y((Fp, Gi) => {
      "use strict";
      function il(e) {
        var t = new e(), r = t;
        function n() {
          var i = t;
          return i.next ? t = i.next : (t = new e(), r = t), i.next = null, i;
        }
        function s(i) {
          r.next = i, r = i;
        }
        return { get: n, release: s };
      }
      Gi.exports = il;
    });
    var Wi = y((qp, gr) => {
      "use strict";
      var ol = ji();
      function Ui(e, t, r) {
        if (typeof e == "function" && (r = t, t = e, e = null), r < 1)
          throw new Error("fastqueue concurrency must be greater than 1");
        var n = ol(al), s = null, i = null, o = 0, a = null, u = { push: E, drain: J, saturated: J, pause: f, paused: false, concurrency: r, running: d, resume: T, idle: S, length: g, getQueue: p, unshift: b, empty: J, kill: k, killAndDrain: I, error: Z };
        return u;
        function d() {
          return o;
        }
        function f() {
          u.paused = true;
        }
        function g() {
          for (var w = s, D = 0; w; )
            w = w.next, D++;
          return D;
        }
        function p() {
          for (var w = s, D = []; w; )
            D.push(w.value), w = w.next;
          return D;
        }
        function T() {
          if (u.paused) {
            u.paused = false;
            for (var w = 0; w < u.concurrency; w++)
              o++, v();
          }
        }
        function S() {
          return o === 0 && u.length() === 0;
        }
        function E(w, D) {
          var x = n.get();
          x.context = e, x.release = v, x.value = w, x.callback = D || J, x.errorHandler = a, o === u.concurrency || u.paused ? i ? (i.next = x, i = x) : (s = x, i = x, u.saturated()) : (o++, t.call(e, x.value, x.worked));
        }
        function b(w, D) {
          var x = n.get();
          x.context = e, x.release = v, x.value = w, x.callback = D || J, o === u.concurrency || u.paused ? s ? (x.next = s, s = x) : (s = x, i = x, u.saturated()) : (o++, t.call(e, x.value, x.worked));
        }
        function v(w) {
          w && n.release(w);
          var D = s;
          D ? u.paused ? o-- : (i === s && (i = null), s = D.next, D.next = null, t.call(e, D.value, D.worked), i === null && u.empty()) : --o === 0 && u.drain();
        }
        function k() {
          s = null, i = null, u.drain = J;
        }
        function I() {
          s = null, i = null, u.drain(), u.drain = J;
        }
        function Z(w) {
          a = w;
        }
      }
      function J() {
      }
      function al() {
        this.value = null, this.callback = J, this.next = null, this.release = J, this.context = null, this.errorHandler = null;
        var e = this;
        this.worked = function(r, n) {
          var s = e.callback, i = e.errorHandler, o = e.value;
          e.value = null, e.callback = J, e.errorHandler && i(r, o), s.call(e.context, r, n), e.release(e);
        };
      }
      function ul(e, t, r) {
        typeof e == "function" && (r = t, t = e, e = null);
        function n(f, g) {
          t.call(this, f).then(function(p) {
            g(null, p);
          }, g);
        }
        var s = Ui(e, n, r), i = s.push, o = s.unshift;
        return s.push = a, s.unshift = u, s.drained = d, s;
        function a(f) {
          var g = new Promise(function(p, T) {
            i(f, function(S, E) {
              if (S) {
                T(S);
                return;
              }
              p(E);
            });
          });
          return g.catch(J), g;
        }
        function u(f) {
          var g = new Promise(function(p, T) {
            o(f, function(S, E) {
              if (S) {
                T(S);
                return;
              }
              p(E);
            });
          });
          return g.catch(J), g;
        }
        function d() {
          if (s.idle())
            return new Promise(function(p) {
              p();
            });
          var f = s.drain, g = new Promise(function(p) {
            s.drain = function() {
              f(), p();
            };
          });
          return g;
        }
      }
      gr.exports = Ui;
      gr.exports.promise = ul;
    });
    var yt = y((oe) => {
      "use strict";
      Object.defineProperty(oe, "__esModule", { value: true });
      oe.joinPathSegments = oe.replacePathSegmentSeparator = oe.isAppliedFilter = oe.isFatalError = void 0;
      function cl(e, t) {
        return e.errorFilter === null ? true : !e.errorFilter(t);
      }
      oe.isFatalError = cl;
      function ll(e, t) {
        return e === null || e(t);
      }
      oe.isAppliedFilter = ll;
      function fl(e, t) {
        return e.split(/[/\\]/).join(t);
      }
      oe.replacePathSegmentSeparator = fl;
      function pl(e, t, r) {
        return e === "" ? t : e.endsWith(r) ? e + t : e + r + t;
      }
      oe.joinPathSegments = pl;
    });
    var mr = y((Sr) => {
      "use strict";
      Object.defineProperty(Sr, "__esModule", { value: true });
      var hl = yt(), yr = class {
        constructor(t, r) {
          this._root = t, this._settings = r, this._root = hl.replacePathSegmentSeparator(t, r.pathSegmentSeparator);
        }
      };
      Sr.default = yr;
    });
    var Rr = y((Ar) => {
      "use strict";
      Object.defineProperty(Ar, "__esModule", { value: true });
      var dl = require("events"), _l = gt(), gl = Wi(), St = yt(), yl = mr(), Er = class extends yl.default {
        constructor(t, r) {
          super(t, r), this._settings = r, this._scandir = _l.scandir, this._emitter = new dl.EventEmitter(), this._queue = gl(this._worker.bind(this), this._settings.concurrency), this._isFatalError = false, this._isDestroyed = false, this._queue.drain = () => {
            this._isFatalError || this._emitter.emit("end");
          };
        }
        read() {
          return this._isFatalError = false, this._isDestroyed = false, setImmediate(() => {
            this._pushToQueue(this._root, this._settings.basePath);
          }), this._emitter;
        }
        get isDestroyed() {
          return this._isDestroyed;
        }
        destroy() {
          if (this._isDestroyed)
            throw new Error("The reader is already destroyed");
          this._isDestroyed = true, this._queue.killAndDrain();
        }
        onEntry(t) {
          this._emitter.on("entry", t);
        }
        onError(t) {
          this._emitter.once("error", t);
        }
        onEnd(t) {
          this._emitter.once("end", t);
        }
        _pushToQueue(t, r) {
          let n = { directory: t, base: r };
          this._queue.push(n, (s) => {
            s !== null && this._handleError(s);
          });
        }
        _worker(t, r) {
          this._scandir(t.directory, this._settings.fsScandirSettings, (n, s) => {
            if (n !== null) {
              r(n, void 0);
              return;
            }
            for (let i of s)
              this._handleEntry(i, t.base);
            r(null, void 0);
          });
        }
        _handleError(t) {
          this._isDestroyed || !St.isFatalError(this._settings, t) || (this._isFatalError = true, this._isDestroyed = true, this._emitter.emit("error", t));
        }
        _handleEntry(t, r) {
          if (this._isDestroyed || this._isFatalError)
            return;
          let n = t.path;
          r !== void 0 && (t.path = St.joinPathSegments(r, t.name, this._settings.pathSegmentSeparator)), St.isAppliedFilter(this._settings.entryFilter, t) && this._emitEntry(t), t.dirent.isDirectory() && St.isAppliedFilter(this._settings.deepFilter, t) && this._pushToQueue(n, r === void 0 ? void 0 : t.path);
        }
        _emitEntry(t) {
          this._emitter.emit("entry", t);
        }
      };
      Ar.default = Er;
    });
    var Vi = y((vr) => {
      "use strict";
      Object.defineProperty(vr, "__esModule", { value: true });
      var Sl = Rr(), br = class {
        constructor(t, r) {
          this._root = t, this._settings = r, this._reader = new Sl.default(this._root, this._settings), this._storage = [];
        }
        read(t) {
          this._reader.onError((r) => {
            ml(t, r);
          }), this._reader.onEntry((r) => {
            this._storage.push(r);
          }), this._reader.onEnd(() => {
            El(t, this._storage);
          }), this._reader.read();
        }
      };
      vr.default = br;
      function ml(e, t) {
        e(t);
      }
      function El(e, t) {
        e(null, t);
      }
    });
    var Ki = y((Pr) => {
      "use strict";
      Object.defineProperty(Pr, "__esModule", { value: true });
      var Al = require("stream"), Rl = Rr(), xr = class {
        constructor(t, r) {
          this._root = t, this._settings = r, this._reader = new Rl.default(this._root, this._settings), this._stream = new Al.Readable({ objectMode: true, read: () => {
          }, destroy: () => {
            this._reader.isDestroyed || this._reader.destroy();
          } });
        }
        read() {
          return this._reader.onError((t) => {
            this._stream.emit("error", t);
          }), this._reader.onEntry((t) => {
            this._stream.push(t);
          }), this._reader.onEnd(() => {
            this._stream.push(null);
          }), this._reader.read(), this._stream;
        }
      };
      Pr.default = xr;
    });
    var Xi = y((Cr) => {
      "use strict";
      Object.defineProperty(Cr, "__esModule", { value: true });
      var bl = gt(), mt = yt(), vl = mr(), wr = class extends vl.default {
        constructor() {
          super(...arguments), this._scandir = bl.scandirSync, this._storage = [], this._queue = /* @__PURE__ */ new Set();
        }
        read() {
          return this._pushToQueue(this._root, this._settings.basePath), this._handleQueue(), this._storage;
        }
        _pushToQueue(t, r) {
          this._queue.add({ directory: t, base: r });
        }
        _handleQueue() {
          for (let t of this._queue.values())
            this._handleDirectory(t.directory, t.base);
        }
        _handleDirectory(t, r) {
          try {
            let n = this._scandir(t, this._settings.fsScandirSettings);
            for (let s of n)
              this._handleEntry(s, r);
          } catch (n) {
            this._handleError(n);
          }
        }
        _handleError(t) {
          if (mt.isFatalError(this._settings, t))
            throw t;
        }
        _handleEntry(t, r) {
          let n = t.path;
          r !== void 0 && (t.path = mt.joinPathSegments(r, t.name, this._settings.pathSegmentSeparator)), mt.isAppliedFilter(this._settings.entryFilter, t) && this._pushToStorage(t), t.dirent.isDirectory() && mt.isAppliedFilter(this._settings.deepFilter, t) && this._pushToQueue(n, r === void 0 ? void 0 : t.path);
        }
        _pushToStorage(t) {
          this._storage.push(t);
        }
      };
      Cr.default = wr;
    });
    var Qi = y((Or) => {
      "use strict";
      Object.defineProperty(Or, "__esModule", { value: true });
      var xl = Xi(), Tr = class {
        constructor(t, r) {
          this._root = t, this._settings = r, this._reader = new xl.default(this._root, this._settings);
        }
        read() {
          return this._reader.read();
        }
      };
      Or.default = Tr;
    });
    var Yi = y((kr) => {
      "use strict";
      Object.defineProperty(kr, "__esModule", { value: true });
      var Pl = require("path"), wl = gt(), Lr = class {
        constructor(t = {}) {
          this._options = t, this.basePath = this._getValue(this._options.basePath, void 0), this.concurrency = this._getValue(this._options.concurrency, Number.POSITIVE_INFINITY), this.deepFilter = this._getValue(this._options.deepFilter, null), this.entryFilter = this._getValue(this._options.entryFilter, null), this.errorFilter = this._getValue(this._options.errorFilter, null), this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, Pl.sep), this.fsScandirSettings = new wl.Settings({ followSymbolicLinks: this._options.followSymbolicLinks, fs: this._options.fs, pathSegmentSeparator: this._options.pathSegmentSeparator, stats: this._options.stats, throwErrorOnBrokenSymbolicLink: this._options.throwErrorOnBrokenSymbolicLink });
        }
        _getValue(t, r) {
          return t ?? r;
        }
      };
      kr.default = Lr;
    });
    var At = y((ae) => {
      "use strict";
      Object.defineProperty(ae, "__esModule", { value: true });
      ae.Settings = ae.walkStream = ae.walkSync = ae.walk = void 0;
      var Zi = Vi(), Cl = Ki(), Tl = Qi(), $r = Yi();
      ae.Settings = $r.default;
      function Ol(e, t, r) {
        if (typeof t == "function") {
          new Zi.default(e, Et()).read(t);
          return;
        }
        new Zi.default(e, Et(t)).read(r);
      }
      ae.walk = Ol;
      function Ll(e, t) {
        let r = Et(t);
        return new Tl.default(e, r).read();
      }
      ae.walkSync = Ll;
      function kl(e, t) {
        let r = Et(t);
        return new Cl.default(e, r).read();
      }
      ae.walkStream = kl;
      function Et(e = {}) {
        return e instanceof $r.default ? e : new $r.default(e);
      }
    });
    var Rt = y((Ir) => {
      "use strict";
      Object.defineProperty(Ir, "__esModule", { value: true });
      var $l = require("path"), Hl = Re(), zi = ce(), Hr = class {
        constructor(t) {
          this._settings = t, this._fsStatSettings = new Hl.Settings({ followSymbolicLink: this._settings.followSymbolicLinks, fs: this._settings.fs, throwErrorOnBrokenSymbolicLink: this._settings.followSymbolicLinks });
        }
        _getFullEntryPath(t) {
          return $l.resolve(this._settings.cwd, t);
        }
        _makeEntry(t, r) {
          let n = { name: r, path: r, dirent: zi.fs.createDirentFromStats(r, t) };
          return this._settings.stats && (n.stats = t), n;
        }
        _isFatalError(t) {
          return !zi.errno.isEnoentCodeError(t) && !this._settings.suppressErrors;
        }
      };
      Ir.default = Hr;
    });
    var Mr = y((Nr) => {
      "use strict";
      Object.defineProperty(Nr, "__esModule", { value: true });
      var Il = require("stream"), Dl = Re(), Nl = At(), Ml = Rt(), Dr = class extends Ml.default {
        constructor() {
          super(...arguments), this._walkStream = Nl.walkStream, this._stat = Dl.stat;
        }
        dynamic(t, r) {
          return this._walkStream(t, r);
        }
        static(t, r) {
          let n = t.map(this._getFullEntryPath, this), s = new Il.PassThrough({ objectMode: true });
          s._write = (i, o, a) => this._getEntry(n[i], t[i], r).then((u) => {
            u !== null && r.entryFilter(u) && s.push(u), i === n.length - 1 && s.end(), a();
          }).catch(a);
          for (let i = 0; i < n.length; i++)
            s.write(i);
          return s;
        }
        _getEntry(t, r, n) {
          return this._getStat(t).then((s) => this._makeEntry(s, r)).catch((s) => {
            if (n.errorFilter(s))
              return null;
            throw s;
          });
        }
        _getStat(t) {
          return new Promise((r, n) => {
            this._stat(t, this._fsStatSettings, (s, i) => s === null ? r(i) : n(s));
          });
        }
      };
      Nr.default = Dr;
    });
    var Ji = y((qr) => {
      "use strict";
      Object.defineProperty(qr, "__esModule", { value: true });
      var Fl = At(), ql = Rt(), Bl = Mr(), Fr = class extends ql.default {
        constructor() {
          super(...arguments), this._walkAsync = Fl.walk, this._readerStream = new Bl.default(this._settings);
        }
        dynamic(t, r) {
          return new Promise((n, s) => {
            this._walkAsync(t, r, (i, o) => {
              i === null ? n(o) : s(i);
            });
          });
        }
        async static(t, r) {
          let n = [], s = this._readerStream.static(t, r);
          return new Promise((i, o) => {
            s.once("error", o), s.on("data", (a) => n.push(a)), s.once("end", () => i(n));
          });
        }
      };
      qr.default = Fr;
    });
    var eo = y((Gr) => {
      "use strict";
      Object.defineProperty(Gr, "__esModule", { value: true });
      var He = ce(), Br = class {
        constructor(t, r, n) {
          this._patterns = t, this._settings = r, this._micromatchOptions = n, this._storage = [], this._fillStorage();
        }
        _fillStorage() {
          let t = He.pattern.expandPatternsWithBraceExpansion(this._patterns);
          for (let r of t) {
            let n = this._getPatternSegments(r), s = this._splitSegmentsIntoSections(n);
            this._storage.push({ complete: s.length <= 1, pattern: r, segments: n, sections: s });
          }
        }
        _getPatternSegments(t) {
          return He.pattern.getPatternParts(t, this._micromatchOptions).map((n) => He.pattern.isDynamicPattern(n, this._settings) ? { dynamic: true, pattern: n, patternRe: He.pattern.makeRe(n, this._micromatchOptions) } : { dynamic: false, pattern: n });
        }
        _splitSegmentsIntoSections(t) {
          return He.array.splitWhen(t, (r) => r.dynamic && He.pattern.hasGlobStar(r.pattern));
        }
      };
      Gr.default = Br;
    });
    var to = y((Ur) => {
      "use strict";
      Object.defineProperty(Ur, "__esModule", { value: true });
      var Gl = eo(), jr = class extends Gl.default {
        match(t) {
          let r = t.split("/"), n = r.length, s = this._storage.filter((i) => !i.complete || i.segments.length > n);
          for (let i of s) {
            let o = i.sections[0];
            if (!i.complete && n > o.length || r.every((u, d) => {
              let f = i.segments[d];
              return !!(f.dynamic && f.patternRe.test(u) || !f.dynamic && f.pattern === u);
            }))
              return true;
          }
          return false;
        }
      };
      Ur.default = jr;
    });
    var ro = y((Vr) => {
      "use strict";
      Object.defineProperty(Vr, "__esModule", { value: true });
      var bt = ce(), jl = to(), Wr = class {
        constructor(t, r) {
          this._settings = t, this._micromatchOptions = r;
        }
        getFilter(t, r, n) {
          let s = this._getMatcher(r), i = this._getNegativePatternsRe(n);
          return (o) => this._filter(t, o, s, i);
        }
        _getMatcher(t) {
          return new jl.default(t, this._settings, this._micromatchOptions);
        }
        _getNegativePatternsRe(t) {
          let r = t.filter(bt.pattern.isAffectDepthOfReadingPattern);
          return bt.pattern.convertPatternsToRe(r, this._micromatchOptions);
        }
        _filter(t, r, n, s) {
          if (this._isSkippedByDeep(t, r.path) || this._isSkippedSymbolicLink(r))
            return false;
          let i = bt.path.removeLeadingDotSegment(r.path);
          return this._isSkippedByPositivePatterns(i, n) ? false : this._isSkippedByNegativePatterns(i, s);
        }
        _isSkippedByDeep(t, r) {
          return this._settings.deep === 1 / 0 ? false : this._getEntryLevel(t, r) >= this._settings.deep;
        }
        _getEntryLevel(t, r) {
          let n = r.split("/").length;
          if (t === "")
            return n;
          let s = t.split("/").length;
          return n - s;
        }
        _isSkippedSymbolicLink(t) {
          return !this._settings.followSymbolicLinks && t.dirent.isSymbolicLink();
        }
        _isSkippedByPositivePatterns(t, r) {
          return !this._settings.baseNameMatch && !r.match(t);
        }
        _isSkippedByNegativePatterns(t, r) {
          return !bt.pattern.matchAny(t, r);
        }
      };
      Vr.default = Wr;
    });
    var no = y((Xr) => {
      "use strict";
      Object.defineProperty(Xr, "__esModule", { value: true });
      var be = ce(), Kr = class {
        constructor(t, r) {
          this._settings = t, this._micromatchOptions = r, this.index = /* @__PURE__ */ new Map();
        }
        getFilter(t, r) {
          let n = be.pattern.convertPatternsToRe(t, this._micromatchOptions), s = be.pattern.convertPatternsToRe(r, this._micromatchOptions);
          return (i) => this._filter(i, n, s);
        }
        _filter(t, r, n) {
          if (this._settings.unique && this._isDuplicateEntry(t) || this._onlyFileFilter(t) || this._onlyDirectoryFilter(t) || this._isSkippedByAbsoluteNegativePatterns(t.path, n))
            return false;
          let s = this._settings.baseNameMatch ? t.name : t.path, i = t.dirent.isDirectory(), o = this._isMatchToPatterns(s, r, i) && !this._isMatchToPatterns(t.path, n, i);
          return this._settings.unique && o && this._createIndexRecord(t), o;
        }
        _isDuplicateEntry(t) {
          return this.index.has(t.path);
        }
        _createIndexRecord(t) {
          this.index.set(t.path, void 0);
        }
        _onlyFileFilter(t) {
          return this._settings.onlyFiles && !t.dirent.isFile();
        }
        _onlyDirectoryFilter(t) {
          return this._settings.onlyDirectories && !t.dirent.isDirectory();
        }
        _isSkippedByAbsoluteNegativePatterns(t, r) {
          if (!this._settings.absolute)
            return false;
          let n = be.path.makeAbsolute(this._settings.cwd, t);
          return be.pattern.matchAny(n, r);
        }
        _isMatchToPatterns(t, r, n) {
          let s = be.path.removeLeadingDotSegment(t), i = be.pattern.matchAny(s, r);
          return !i && n ? be.pattern.matchAny(s + "/", r) : i;
        }
      };
      Xr.default = Kr;
    });
    var so = y((Yr) => {
      "use strict";
      Object.defineProperty(Yr, "__esModule", { value: true });
      var Ul = ce(), Qr = class {
        constructor(t) {
          this._settings = t;
        }
        getFilter() {
          return (t) => this._isNonFatalError(t);
        }
        _isNonFatalError(t) {
          return Ul.errno.isEnoentCodeError(t) || this._settings.suppressErrors;
        }
      };
      Yr.default = Qr;
    });
    var oo = y((zr) => {
      "use strict";
      Object.defineProperty(zr, "__esModule", { value: true });
      var io = ce(), Zr = class {
        constructor(t) {
          this._settings = t;
        }
        getTransformer() {
          return (t) => this._transform(t);
        }
        _transform(t) {
          let r = t.path;
          return this._settings.absolute && (r = io.path.makeAbsolute(this._settings.cwd, r), r = io.path.unixify(r)), this._settings.markDirectories && t.dirent.isDirectory() && (r += "/"), this._settings.objectMode ? Object.assign(Object.assign({}, t), { path: r }) : r;
        }
      };
      zr.default = Zr;
    });
    var vt = y((en) => {
      "use strict";
      Object.defineProperty(en, "__esModule", { value: true });
      var Wl = require("path"), Vl = ro(), Kl = no(), Xl = so(), Ql = oo(), Jr = class {
        constructor(t) {
          this._settings = t, this.errorFilter = new Xl.default(this._settings), this.entryFilter = new Kl.default(this._settings, this._getMicromatchOptions()), this.deepFilter = new Vl.default(this._settings, this._getMicromatchOptions()), this.entryTransformer = new Ql.default(this._settings);
        }
        _getRootDirectory(t) {
          return Wl.resolve(this._settings.cwd, t.base);
        }
        _getReaderOptions(t) {
          let r = t.base === "." ? "" : t.base;
          return { basePath: r, pathSegmentSeparator: "/", concurrency: this._settings.concurrency, deepFilter: this.deepFilter.getFilter(r, t.positive, t.negative), entryFilter: this.entryFilter.getFilter(t.positive, t.negative), errorFilter: this.errorFilter.getFilter(), followSymbolicLinks: this._settings.followSymbolicLinks, fs: this._settings.fs, stats: this._settings.stats, throwErrorOnBrokenSymbolicLink: this._settings.throwErrorOnBrokenSymbolicLink, transform: this.entryTransformer.getTransformer() };
        }
        _getMicromatchOptions() {
          return { dot: this._settings.dot, matchBase: this._settings.baseNameMatch, nobrace: !this._settings.braceExpansion, nocase: !this._settings.caseSensitiveMatch, noext: !this._settings.extglob, noglobstar: !this._settings.globstar, posix: true, strictSlashes: false };
        }
      };
      en.default = Jr;
    });
    var ao = y((rn) => {
      "use strict";
      Object.defineProperty(rn, "__esModule", { value: true });
      var Yl = Ji(), Zl = vt(), tn = class extends Zl.default {
        constructor() {
          super(...arguments), this._reader = new Yl.default(this._settings);
        }
        async read(t) {
          let r = this._getRootDirectory(t), n = this._getReaderOptions(t);
          return (await this.api(r, t, n)).map((i) => n.transform(i));
        }
        api(t, r, n) {
          return r.dynamic ? this._reader.dynamic(t, n) : this._reader.static(r.patterns, n);
        }
      };
      rn.default = tn;
    });
    var uo = y((sn) => {
      "use strict";
      Object.defineProperty(sn, "__esModule", { value: true });
      var zl = require("stream"), Jl = Mr(), ef = vt(), nn = class extends ef.default {
        constructor() {
          super(...arguments), this._reader = new Jl.default(this._settings);
        }
        read(t) {
          let r = this._getRootDirectory(t), n = this._getReaderOptions(t), s = this.api(r, t, n), i = new zl.Readable({ objectMode: true, read: () => {
          } });
          return s.once("error", (o) => i.emit("error", o)).on("data", (o) => i.emit("data", n.transform(o))).once("end", () => i.emit("end")), i.once("close", () => s.destroy()), i;
        }
        api(t, r, n) {
          return r.dynamic ? this._reader.dynamic(t, n) : this._reader.static(r.patterns, n);
        }
      };
      sn.default = nn;
    });
    var co = y((an) => {
      "use strict";
      Object.defineProperty(an, "__esModule", { value: true });
      var tf = Re(), rf = At(), nf = Rt(), on = class extends nf.default {
        constructor() {
          super(...arguments), this._walkSync = rf.walkSync, this._statSync = tf.statSync;
        }
        dynamic(t, r) {
          return this._walkSync(t, r);
        }
        static(t, r) {
          let n = [];
          for (let s of t) {
            let i = this._getFullEntryPath(s), o = this._getEntry(i, s, r);
            o === null || !r.entryFilter(o) || n.push(o);
          }
          return n;
        }
        _getEntry(t, r, n) {
          try {
            let s = this._getStat(t);
            return this._makeEntry(s, r);
          } catch (s) {
            if (n.errorFilter(s))
              return null;
            throw s;
          }
        }
        _getStat(t) {
          return this._statSync(t, this._fsStatSettings);
        }
      };
      an.default = on;
    });
    var lo = y((cn) => {
      "use strict";
      Object.defineProperty(cn, "__esModule", { value: true });
      var sf = co(), of = vt(), un = class extends of.default {
        constructor() {
          super(...arguments), this._reader = new sf.default(this._settings);
        }
        read(t) {
          let r = this._getRootDirectory(t), n = this._getReaderOptions(t);
          return this.api(r, t, n).map(n.transform);
        }
        api(t, r, n) {
          return r.dynamic ? this._reader.dynamic(t, n) : this._reader.static(r.patterns, n);
        }
      };
      cn.default = un;
    });
    var fo = y((De) => {
      "use strict";
      Object.defineProperty(De, "__esModule", { value: true });
      De.DEFAULT_FILE_SYSTEM_ADAPTER = void 0;
      var Ie = require("fs"), af = require("os"), uf = Math.max(af.cpus().length, 1);
      De.DEFAULT_FILE_SYSTEM_ADAPTER = { lstat: Ie.lstat, lstatSync: Ie.lstatSync, stat: Ie.stat, statSync: Ie.statSync, readdir: Ie.readdir, readdirSync: Ie.readdirSync };
      var ln = class {
        constructor(t = {}) {
          this._options = t, this.absolute = this._getValue(this._options.absolute, false), this.baseNameMatch = this._getValue(this._options.baseNameMatch, false), this.braceExpansion = this._getValue(this._options.braceExpansion, true), this.caseSensitiveMatch = this._getValue(this._options.caseSensitiveMatch, true), this.concurrency = this._getValue(this._options.concurrency, uf), this.cwd = this._getValue(this._options.cwd, process.cwd()), this.deep = this._getValue(this._options.deep, 1 / 0), this.dot = this._getValue(this._options.dot, false), this.extglob = this._getValue(this._options.extglob, true), this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, true), this.fs = this._getFileSystemMethods(this._options.fs), this.globstar = this._getValue(this._options.globstar, true), this.ignore = this._getValue(this._options.ignore, []), this.markDirectories = this._getValue(this._options.markDirectories, false), this.objectMode = this._getValue(this._options.objectMode, false), this.onlyDirectories = this._getValue(this._options.onlyDirectories, false), this.onlyFiles = this._getValue(this._options.onlyFiles, true), this.stats = this._getValue(this._options.stats, false), this.suppressErrors = this._getValue(this._options.suppressErrors, false), this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, false), this.unique = this._getValue(this._options.unique, true), this.onlyDirectories && (this.onlyFiles = false), this.stats && (this.objectMode = true);
        }
        _getValue(t, r) {
          return t === void 0 ? r : t;
        }
        _getFileSystemMethods(t = {}) {
          return Object.assign(Object.assign({}, De.DEFAULT_FILE_SYSTEM_ADAPTER), t);
        }
      };
      De.default = ln;
    });
    var dn = y((fh, _o) => {
      "use strict";
      var po = fi(), ho = hi(), cf = ao(), lf = uo(), ff = lo(), fn = fo(), ve = ce();
      async function pn(e, t) {
        Ne(e);
        let r = hn(e, cf.default, t), n = await Promise.all(r);
        return ve.array.flatten(n);
      }
      (function(e) {
        function t(o, a) {
          Ne(o);
          let u = hn(o, ff.default, a);
          return ve.array.flatten(u);
        }
        e.sync = t;
        function r(o, a) {
          Ne(o);
          let u = hn(o, lf.default, a);
          return ve.stream.merge(u);
        }
        e.stream = r;
        function n(o, a) {
          Ne(o);
          let u = ho.transform([].concat(o)), d = new fn.default(a);
          return po.generate(u, d);
        }
        e.generateTasks = n;
        function s(o, a) {
          Ne(o);
          let u = new fn.default(a);
          return ve.pattern.isDynamicPattern(o, u);
        }
        e.isDynamicPattern = s;
        function i(o) {
          return Ne(o), ve.path.escape(o);
        }
        e.escapePath = i;
      })(pn || (pn = {}));
      function hn(e, t, r) {
        let n = ho.transform([].concat(e)), s = new fn.default(r), i = po.generate(n, s), o = new t(s);
        return i.map(o.read, o);
      }
      function Ne(e) {
        if (![].concat(e).every((n) => ve.string.isString(n) && !ve.string.isEmpty(n)))
          throw new TypeError("Patterns must be a string (non empty) or an array of strings");
      }
      _o.exports = pn;
    });
    var yo = y((xe) => {
      "use strict";
      var { promisify: pf } = require("util"), go = require("fs");
      async function _n(e, t, r) {
        if (typeof r != "string")
          throw new TypeError(`Expected a string, got ${typeof r}`);
        try {
          return (await pf(go[e])(r))[t]();
        } catch (n) {
          if (n.code === "ENOENT")
            return false;
          throw n;
        }
      }
      function gn(e, t, r) {
        if (typeof r != "string")
          throw new TypeError(`Expected a string, got ${typeof r}`);
        try {
          return go[e](r)[t]();
        } catch (n) {
          if (n.code === "ENOENT")
            return false;
          throw n;
        }
      }
      xe.isFile = _n.bind(null, "stat", "isFile");
      xe.isDirectory = _n.bind(null, "stat", "isDirectory");
      xe.isSymlink = _n.bind(null, "lstat", "isSymbolicLink");
      xe.isFileSync = gn.bind(null, "statSync", "isFile");
      xe.isDirectorySync = gn.bind(null, "statSync", "isDirectory");
      xe.isSymlinkSync = gn.bind(null, "lstatSync", "isSymbolicLink");
    });
    var Ro = y((hh, yn) => {
      "use strict";
      var Pe = require("path"), So = yo(), mo = (e) => e.length > 1 ? `{${e.join(",")}}` : e[0], Eo = (e, t) => {
        let r = e[0] === "!" ? e.slice(1) : e;
        return Pe.isAbsolute(r) ? r : Pe.join(t, r);
      }, hf = (e, t) => Pe.extname(e) ? `**/${e}` : `**/${e}.${mo(t)}`, Ao = (e, t) => {
        if (t.files && !Array.isArray(t.files))
          throw new TypeError(`Expected \`files\` to be of type \`Array\` but received type \`${typeof t.files}\``);
        if (t.extensions && !Array.isArray(t.extensions))
          throw new TypeError(`Expected \`extensions\` to be of type \`Array\` but received type \`${typeof t.extensions}\``);
        return t.files && t.extensions ? t.files.map((r) => Pe.posix.join(e, hf(r, t.extensions))) : t.files ? t.files.map((r) => Pe.posix.join(e, `**/${r}`)) : t.extensions ? [Pe.posix.join(e, `**/*.${mo(t.extensions)}`)] : [Pe.posix.join(e, "**")];
      };
      yn.exports = async (e, t) => {
        if (t = { cwd: process.cwd(), ...t }, typeof t.cwd != "string")
          throw new TypeError(`Expected \`cwd\` to be of type \`string\` but received type \`${typeof t.cwd}\``);
        let r = await Promise.all([].concat(e).map(async (n) => await So.isDirectory(Eo(n, t.cwd)) ? Ao(n, t) : n));
        return [].concat.apply([], r);
      };
      yn.exports.sync = (e, t) => {
        if (t = { cwd: process.cwd(), ...t }, typeof t.cwd != "string")
          throw new TypeError(`Expected \`cwd\` to be of type \`string\` but received type \`${typeof t.cwd}\``);
        let r = [].concat(e).map((n) => So.isDirectorySync(Eo(n, t.cwd)) ? Ao(n, t) : n);
        return [].concat.apply([], r);
      };
    });
    var ko = y((dh, Lo) => {
      function bo(e) {
        return Array.isArray(e) ? e : [e];
      }
      var wo = "", vo = " ", Sn = "\\", df = /^\s+$/, _f = /(?:[^\\]|^)\\$/, gf = /^\\!/, yf = /^\\#/, Sf = /\r?\n/g, mf = /^\.*\/|^\.+$/, mn = "/", Co = "node-ignore";
      typeof Symbol < "u" && (Co = Symbol.for("node-ignore"));
      var xo = Co, Ef = (e, t, r) => Object.defineProperty(e, t, { value: r }), Af = /([0-z])-([0-z])/g, To = () => false, Rf = (e) => e.replace(Af, (t, r, n) => r.charCodeAt(0) <= n.charCodeAt(0) ? t : wo), bf = (e) => {
        let { length: t } = e;
        return e.slice(0, t - t % 2);
      }, vf = [[/\\?\s+$/, (e) => e.indexOf("\\") === 0 ? vo : wo], [/\\\s/g, () => vo], [/[\\$.|*+(){^]/g, (e) => `\\${e}`], [/(?!\\)\?/g, () => "[^/]"], [/^\//, () => "^"], [/\//g, () => "\\/"], [/^\^*\\\*\\\*\\\//, () => "^(?:.*\\/)?"], [/^(?=[^^])/, function() {
        return /\/(?!$)/.test(this) ? "^" : "(?:^|\\/)";
      }], [/\\\/\\\*\\\*(?=\\\/|$)/g, (e, t, r) => t + 6 < r.length ? "(?:\\/[^\\/]+)*" : "\\/.+"], [/(^|[^\\]+)(\\\*)+(?=.+)/g, (e, t, r) => {
        let n = r.replace(/\\\*/g, "[^\\/]*");
        return t + n;
      }], [/\\\\\\(?=[$.|*+(){^])/g, () => Sn], [/\\\\/g, () => Sn], [/(\\)?\[([^\]/]*?)(\\*)($|\])/g, (e, t, r, n, s) => t === Sn ? `\\[${r}${bf(n)}${s}` : s === "]" && n.length % 2 === 0 ? `[${Rf(r)}${n}]` : "[]"], [/(?:[^*])$/, (e) => /\/$/.test(e) ? `${e}$` : `${e}(?=$|\\/$)`], [/(\^|\\\/)?\\\*$/, (e, t) => `${t ? `${t}[^/]+` : "[^/]*"}(?=$|\\/$)`]], Po = /* @__PURE__ */ Object.create(null), xf = (e, t) => {
        let r = Po[e];
        return r || (r = vf.reduce((n, s) => n.replace(s[0], s[1].bind(e)), e), Po[e] = r), t ? new RegExp(r, "i") : new RegExp(r);
      }, Rn = (e) => typeof e == "string", Pf = (e) => e && Rn(e) && !df.test(e) && !_f.test(e) && e.indexOf("#") !== 0, wf = (e) => e.split(Sf), En = class {
        constructor(t, r, n, s) {
          this.origin = t, this.pattern = r, this.negative = n, this.regex = s;
        }
      }, Cf = (e, t) => {
        let r = e, n = false;
        e.indexOf("!") === 0 && (n = true, e = e.substr(1)), e = e.replace(gf, "!").replace(yf, "#");
        let s = xf(e, t);
        return new En(r, e, n, s);
      }, Tf = (e, t) => {
        throw new t(e);
      }, fe = (e, t, r) => Rn(e) ? e ? fe.isNotRelative(e) ? r(`path should be a \`path.relative()\`d string, but got "${t}"`, RangeError) : true : r("path must not be empty", TypeError) : r(`path must be a string, but got \`${t}\``, TypeError), Oo = (e) => mf.test(e);
      fe.isNotRelative = Oo;
      fe.convert = (e) => e;
      var An = class {
        constructor({ ignorecase: t = true, ignoreCase: r = t, allowRelativePaths: n = false } = {}) {
          Ef(this, xo, true), this._rules = [], this._ignoreCase = r, this._allowRelativePaths = n, this._initCache();
        }
        _initCache() {
          this._ignoreCache = /* @__PURE__ */ Object.create(null), this._testCache = /* @__PURE__ */ Object.create(null);
        }
        _addPattern(t) {
          if (t && t[xo]) {
            this._rules = this._rules.concat(t._rules), this._added = true;
            return;
          }
          if (Pf(t)) {
            let r = Cf(t, this._ignoreCase);
            this._added = true, this._rules.push(r);
          }
        }
        add(t) {
          return this._added = false, bo(Rn(t) ? wf(t) : t).forEach(this._addPattern, this), this._added && this._initCache(), this;
        }
        addPattern(t) {
          return this.add(t);
        }
        _testOne(t, r) {
          let n = false, s = false;
          return this._rules.forEach((i) => {
            let { negative: o } = i;
            if (s === o && n !== s || o && !n && !s && !r)
              return;
            i.regex.test(t) && (n = !o, s = o);
          }), { ignored: n, unignored: s };
        }
        _test(t, r, n, s) {
          let i = t && fe.convert(t);
          return fe(i, t, this._allowRelativePaths ? To : Tf), this._t(i, r, n, s);
        }
        _t(t, r, n, s) {
          if (t in r)
            return r[t];
          if (s || (s = t.split(mn)), s.pop(), !s.length)
            return r[t] = this._testOne(t, n);
          let i = this._t(s.join(mn) + mn, r, n, s);
          return r[t] = i.ignored ? i : this._testOne(t, n);
        }
        ignores(t) {
          return this._test(t, this._ignoreCache, false).ignored;
        }
        createFilter() {
          return (t) => !this.ignores(t);
        }
        filter(t) {
          return bo(t).filter(this.createFilter());
        }
        test(t) {
          return this._test(t, this._testCache, true);
        }
      }, xt = (e) => new An(e), Of = (e) => fe(e && fe.convert(e), e, To);
      xt.isPathValid = Of;
      xt.default = xt;
      Lo.exports = xt;
      if (typeof process < "u" && (process.env && process.env.IGNORE_TEST_WIN32 || process.platform === "win32")) {
        let e = (r) => /^\\\\\?\\/.test(r) || /["<>|\u0000-\u001F]+/u.test(r) ? r : r.replace(/\\/g, "/");
        fe.convert = e;
        let t = /^[a-z]:\//i;
        fe.isNotRelative = (r) => t.test(r) || Oo(r);
      }
    });
    var Uf = {};
    aa(Uf, { generateGlobTasks: () => Gf, generateGlobTasksSync: () => jf, globby: () => Mf, globbyStream: () => qf, globbySync: () => Ff, isDynamicPattern: () => Bf, isGitIgnored: () => qo, isGitIgnoredSync: () => Bo });
    module2.exports = ua(Uf);
    var Go = re(require("node:fs"), 1);
    var jo = re(require("node:path"), 1);
    var Uo = re(Lt(), 1);
    var We = re(dn(), 1);
    var Ue = re(Ro(), 1);
    var Io = re(require("node:process"), 1);
    var bn = re(require("node:fs"), 1);
    var we = re(require("node:path"), 1);
    var vn = re(dn(), 1);
    var Do = re(ko(), 1);
    function Me(e) {
      let t = /^\\\\\?\\/.test(e), r = /[^\u0000-\u0080]+/.test(e);
      return t || r ? e : e.replace(/\\/g, "/");
    }
    var $o = require("node:url");
    var Ho = require("node:stream");
    var je = (e) => e instanceof URL ? (0, $o.fileURLToPath)(e) : e;
    var Pt = class extends Ho.Transform {
      constructor(t) {
        super({ objectMode: true, transform(r, n, s) {
          s(void 0, t(r) ? r : void 0);
        } });
      }
    };
    var wt = (e) => e[0] === "!";
    var No = { ignore: ["**/node_modules", "**/flow-typed", "**/coverage", "**/.git"], absolute: true, dot: true };
    var Ct = "**/.gitignore";
    var Lf = (e, t) => wt(e) ? "!" + we.default.posix.join(t, e.slice(1)) : we.default.posix.join(t, e);
    var kf = (e, t) => {
      let r = Me(we.default.relative(t, we.default.dirname(e.filePath)));
      return e.content.split(/\r?\n/).filter((n) => n && !n.startsWith("#")).map((n) => Lf(n, r));
    };
    var $f = (e, t) => {
      if (t = Me(t), we.default.isAbsolute(e)) {
        if (Me(e).startsWith(t))
          return we.default.relative(t, e);
        throw new Error(`Path ${e} is not in cwd ${t}`);
      }
      return e;
    };
    var Mo = (e, t) => {
      let r = e.flatMap((s) => kf(s, t)), n = (0, Do.default)().add(r);
      return (s) => (s = je(s), s = $f(s, t), s ? n.ignores(Me(s)) : false);
    };
    var Fo = (e = {}) => ({ cwd: je(e.cwd) || Io.default.cwd() });
    var xn = async (e, t) => {
      let { cwd: r } = Fo(t), n = await (0, vn.default)(e, { cwd: r, ...No }), s = await Promise.all(n.map(async (i) => ({ filePath: i, content: await bn.default.promises.readFile(i, "utf8") })));
      return Mo(s, r);
    };
    var Pn = (e, t) => {
      let { cwd: r } = Fo(t), s = vn.default.sync(e, { cwd: r, ...No }).map((i) => ({ filePath: i, content: bn.default.readFileSync(i, "utf8") }));
      return Mo(s, r);
    };
    var qo = (e) => xn(Ct, e);
    var Bo = (e) => Pn(Ct, e);
    var Hf = (e) => {
      if (e.some((t) => typeof t != "string"))
        throw new TypeError("Patterns must be a string or an array of strings");
    };
    var wn = (e) => (e = [...new Set([e].flat())], Hf(e), e);
    var If = (e) => {
      if (!e.cwd)
        return;
      let t;
      try {
        t = Go.default.statSync(e.cwd);
      } catch {
        return;
      }
      if (!t.isDirectory())
        throw new Error("The `cwd` option must be a path to a directory");
    };
    var Wo = (e = {}) => (e = { ignore: [], expandDirectories: true, ...e, cwd: je(e.cwd) }, If(e), e);
    var Vo = (e) => async (t, r) => e(wn(t), Wo(r));
    var Tt = (e) => (t, r) => e(wn(t), Wo(r));
    var Ko = (e) => {
      let { ignoreFiles: t, gitignore: r } = e, n = t ? wn(t) : [];
      return r && n.push(Ct), n;
    };
    var Df = async (e) => {
      let t = Ko(e);
      return Qo(t.length > 0 && await xn(t, { cwd: e.cwd }));
    };
    var Xo = (e) => {
      let t = Ko(e);
      return Qo(t.length > 0 && Pn(t, { cwd: e.cwd }));
    };
    var Qo = (e) => {
      let t = /* @__PURE__ */ new Set();
      return (r) => {
        let n = r.path || r, s = jo.default.normalize(n), i = t.has(s) || e && e(n);
        return t.add(s), !i;
      };
    };
    var Yo = (e, t) => e.flat().filter((r) => t(r));
    var Nf = (e, t) => (0, Uo.default)(e).pipe(new Pt((r) => t(r)));
    var Zo = (e, t) => {
      let r = [];
      for (; e.length > 0; ) {
        let n = e.findIndex((i) => wt(i));
        if (n === -1) {
          r.push({ patterns: e, options: t });
          break;
        }
        let s = e[n].slice(1);
        for (let i of r)
          i.options.ignore.push(s);
        n !== 0 && r.push({ patterns: e.slice(0, n), options: { ...t, ignore: [...t.ignore, s] } }), e = e.slice(n + 1);
      }
      return r;
    };
    var zo = (e, t) => ({ ...t ? { cwd: t } : {}, ...Array.isArray(e) ? { files: e } : e });
    var Jo = async (e, t) => {
      let r = Zo(e, t), { cwd: n, expandDirectories: s } = t;
      if (!s)
        return r;
      let i = zo(s, n), o = n ? { cwd: n } : void 0;
      return Promise.all(r.map(async (a) => {
        let { patterns: u, options: d } = a;
        return [u, d.ignore] = await Promise.all([(0, Ue.default)(u, i), (0, Ue.default)(d.ignore, o)]), { patterns: u, options: d };
      }));
    };
    var Cn = (e, t) => {
      let r = Zo(e, t), { cwd: n, expandDirectories: s } = t;
      if (!s)
        return r;
      let i = zo(s, n), o = n ? { cwd: n } : void 0;
      return r.map((a) => {
        let { patterns: u, options: d } = a;
        return u = Ue.default.sync(u, i), d.ignore = Ue.default.sync(d.ignore, o), { patterns: u, options: d };
      });
    };
    var Mf = Vo(async (e, t) => {
      let [r, n] = await Promise.all([Jo(e, t), Df(t)]), s = await Promise.all(r.map((i) => (0, We.default)(i.patterns, i.options)));
      return Yo(s, n);
    });
    var Ff = Tt((e, t) => {
      let r = Cn(e, t), n = Xo(t), s = r.map((i) => We.default.sync(i.patterns, i.options));
      return Yo(s, n);
    });
    var qf = Tt((e, t) => {
      let r = Cn(e, t), n = Xo(t), s = r.map((i) => We.default.stream(i.patterns, i.options));
      return Nf(s, n);
    });
    var Bf = Tt((e, t) => e.some((r) => We.default.isDynamicPattern(r, t)));
    var Gf = Vo(Jo);
    var jf = Tt(Cn);
  }
});

// out/services/gitignoreFilter.js
var require_gitignoreFilter = __commonJS({
  "out/services/gitignoreFilter.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getGitignoreFilter = void 0;
    var dir_compare_1 = require_src();
    var globby_1 = require_dist();
    function getGitignoreFilter(pathLeft, pathRight) {
      const isIgnoredLeft = (0, globby_1.isGitIgnoredSync)({ cwd: pathLeft });
      const isIgnoredRight = (0, globby_1.isGitIgnoredSync)({ cwd: pathRight });
      const gitignoreFilter = (entry, relativePath, options) => {
        const isIgnored = entry.origin === "left" ? isIgnoredLeft : isIgnoredRight;
        if (entry.name === ".git") {
          return false;
        }
        if (isIgnored(entry.absolutePath)) {
          return false;
        }
        return dir_compare_1.filterHandlers.defaultFilterHandler(entry, relativePath, options);
      };
      return gitignoreFilter;
    }
    exports2.getGitignoreFilter = getGitignoreFilter;
  }
});

// out/services/ignorePatterns.js
var require_ignorePatterns = __commonJS({
  "out/services/ignorePatterns.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.validatePatterns = exports2.applyIgnorePatterns = exports2.applyCodePatterns = exports2.applyLinePatterns = void 0;
    function applyLinePatterns(content, patterns, replacement = "", deleteMatched = false) {
      if (!patterns || patterns.length === 0) {
        return content;
      }
      const regexPatterns = compilePatterns(patterns, false);
      if (regexPatterns.length === 0) {
        return content;
      }
      const lines = content.split(/\r?\n/);
      const processedLines = lines.map((line) => {
        const matched = regexPatterns.some((pattern) => pattern.test(line));
        if (!matched) {
          return line;
        }
        return deleteMatched ? void 0 : replacement;
      }).filter((line) => line !== void 0);
      return processedLines.join("\n");
    }
    exports2.applyLinePatterns = applyLinePatterns;
    function applyCodePatterns(content, patterns) {
      if (!patterns || patterns.length === 0) {
        return content;
      }
      const regexPatterns = compilePatterns(patterns, true);
      if (regexPatterns.length === 0) {
        return content;
      }
      let processedContent = content;
      regexPatterns.forEach((pattern) => {
        processedContent = processedContent.replace(pattern, "");
      });
      return processedContent;
    }
    exports2.applyCodePatterns = applyCodePatterns;
    function applyIgnorePatterns(content, config) {
      var _a, _b;
      let processedContent = content;
      console.log("applyIgnorePatterns - Input length:", content.length);
      console.log("applyIgnorePatterns - Config:", JSON.stringify(config, null, 2));
      if (config.ignoreCodePatterns) {
        console.log("Applying code patterns:", config.ignoreCodePatterns);
        const beforeLength = processedContent.length;
        processedContent = applyCodePatterns(processedContent, config.ignoreCodePatterns);
        console.log(`Code patterns applied: ${beforeLength} -> ${processedContent.length} chars`);
      }
      if (config.ignoreLinePatterns) {
        console.log("Applying line patterns:", config.ignoreLinePatterns);
        const beforeLength = processedContent.length;
        processedContent = applyLinePatterns(processedContent, config.ignoreLinePatterns, (_a = config.ignoreLineReplacement) !== null && _a !== void 0 ? _a : "", (_b = config.ignoreLineDelete) !== null && _b !== void 0 ? _b : false);
        console.log(`Line patterns applied: ${beforeLength} -> ${processedContent.length} chars`);
      }
      console.log("applyIgnorePatterns - Output length:", processedContent.length);
      return processedContent;
    }
    exports2.applyIgnorePatterns = applyIgnorePatterns;
    function compilePatterns(patterns, useMultiline = false) {
      const compiled = [];
      for (const pattern of patterns) {
        try {
          const flags = useMultiline ? "gms" : "gm";
          const regex = new RegExp(pattern, flags);
          compiled.push(regex);
        } catch (error) {
          console.warn(`Invalid regex pattern ignored: ${pattern}`, error);
        }
      }
      return compiled;
    }
    function validatePatterns(patterns) {
      const errors = [];
      for (const pattern of patterns) {
        try {
          new RegExp(pattern);
        } catch (error) {
          errors.push(`Invalid regex pattern: ${pattern} - ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
      return {
        valid: errors.length === 0,
        errors
      };
    }
    exports2.validatePatterns = validatePatterns;
  }
});

// out/services/customFileCompare.js
var require_customFileCompare = __commonJS({
  "out/services/customFileCompare.js"(exports2) {
    "use strict";
    var __awaiter2 = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.createCustomFileCompare = void 0;
    var dir_compare_1 = require_src();
    var fs_1 = require("fs");
    var ignorePatterns_1 = require_ignorePatterns();
    function createCustomFileCompare(config) {
      return function customCompareFileAsync(path1, stat1, path2, stat2, options) {
        return __awaiter2(this, void 0, void 0, function* () {
          const hasPatterns = config.ignoreLinePatterns && config.ignoreLinePatterns.length > 0 || config.ignoreCodePatterns && config.ignoreCodePatterns.length > 0;
          if (!hasPatterns) {
            return dir_compare_1.fileCompareHandlers.lineBasedFileCompare.compareAsync(path1, stat1, path2, stat2, options);
          }
          try {
            const content1 = (0, fs_1.readFileSync)(path1, "utf8");
            const content2 = (0, fs_1.readFileSync)(path2, "utf8");
            console.log("=== CUSTOM FILE COMPARE DEBUG ===");
            console.log("Comparing files:", path1, "vs", path2);
            console.log("Config:", JSON.stringify(config, null, 2));
            console.log("Original content1 length:", content1.length);
            console.log("Original content2 length:", content2.length);
            const processed1 = (0, ignorePatterns_1.applyIgnorePatterns)(content1, config);
            const processed2 = (0, ignorePatterns_1.applyIgnorePatterns)(content2, config);
            console.log("Processed content1 length:", processed1.length);
            console.log("Processed content2 length:", processed2.length);
            console.log("Content1 first 200 chars:", processed1.substring(0, 200));
            console.log("Content2 first 200 chars:", processed2.substring(0, 200));
            let finalContent1 = processed1;
            let finalContent2 = processed2;
            if (options.ignoreLineEnding) {
              finalContent1 = normalizeLineEndings(finalContent1);
              finalContent2 = normalizeLineEndings(finalContent2);
            }
            if (options.ignoreAllWhiteSpaces) {
              finalContent1 = removeAllWhitespace(finalContent1);
              finalContent2 = removeAllWhitespace(finalContent2);
            } else if (options.ignoreWhiteSpaces) {
              finalContent1 = trimLineWhitespace(finalContent1);
              finalContent2 = trimLineWhitespace(finalContent2);
            }
            if (options.ignoreEmptyLines) {
              finalContent1 = removeEmptyLines(finalContent1);
              finalContent2 = removeEmptyLines(finalContent2);
            }
            return finalContent1 === finalContent2;
          } catch (error) {
            console.warn("Error in custom file compare, falling back to default:", error);
            return dir_compare_1.fileCompareHandlers.lineBasedFileCompare.compareAsync(path1, stat1, path2, stat2, options);
          }
        });
      };
    }
    exports2.createCustomFileCompare = createCustomFileCompare;
    function normalizeLineEndings(content) {
      return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }
    function removeAllWhitespace(content) {
      return content.replace(/\s+/g, "");
    }
    function trimLineWhitespace(content) {
      return content.split(/\r?\n/).map((line) => line.trim()).join("\n");
    }
    function removeEmptyLines(content) {
      return content.split(/\r?\n/).filter((line) => line.trim().length > 0).join("\n");
    }
  }
});

// out/services/filteredContentProvider.js
var require_filteredContentProvider = __commonJS({
  "out/services/filteredContentProvider.js"(exports2) {
    "use strict";
    var __awaiter2 = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getFilteredDiffUris = void 0;
    var fs_1 = require("fs");
    var vscode_12 = require("vscode");
    var ignorePatterns_1 = require_ignorePatterns();
    var FILTER_SCHEME = "compare-folders-filtered";
    var contentStore = /* @__PURE__ */ new Map();
    var providerRegistered = false;
    function ensureProviderRegistered() {
      if (providerRegistered) {
        return;
      }
      vscode_12.workspace.registerTextDocumentContentProvider(FILTER_SCHEME, {
        provideTextDocumentContent: (uri) => {
          var _a;
          return (_a = contentStore.get(uri.toString())) !== null && _a !== void 0 ? _a : "";
        }
      });
      providerRegistered = true;
    }
    function normalizeLineEndings(content) {
      return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    }
    function removeAllWhitespace(content) {
      return content.replace(/\s+/g, "");
    }
    function trimLineWhitespace(content) {
      return content.split(/\r?\n/).map((line) => line.trim()).join("\n");
    }
    function removeEmptyLines(content) {
      return content.split(/\r?\n/).filter((line) => line.trim().length > 0).join("\n");
    }
    function applyCompareOptions(content, options) {
      let processed = content;
      if (options.ignoreLineEnding) {
        processed = normalizeLineEndings(processed);
      }
      if (options.ignoreAllWhiteSpaces) {
        processed = removeAllWhitespace(processed);
      } else if (options.ignoreWhiteSpaces) {
        processed = trimLineWhitespace(processed);
      }
      if (options.ignoreEmptyLines) {
        processed = removeEmptyLines(processed);
      }
      return processed;
    }
    function buildFilteredUri(filePath) {
      return vscode_12.Uri.file(filePath).with({ scheme: FILTER_SCHEME });
    }
    function getFilteredDiffUris(file1, file2, options, patternConfig) {
      return __awaiter2(this, void 0, void 0, function* () {
        ensureProviderRegistered();
        const [content1, content2] = yield Promise.all([
          fs_1.promises.readFile(file1, "utf8"),
          fs_1.promises.readFile(file2, "utf8")
        ]);
        const filtered1 = applyCompareOptions((0, ignorePatterns_1.applyIgnorePatterns)(content1, patternConfig), options);
        const filtered2 = applyCompareOptions((0, ignorePatterns_1.applyIgnorePatterns)(content2, patternConfig), options);
        const leftUri = buildFilteredUri(file1);
        const rightUri = buildFilteredUri(file2);
        contentStore.set(leftUri.toString(), filtered1);
        contentStore.set(rightUri.toString(), filtered2);
        return { left: leftUri, right: rightUri };
      });
    }
    exports2.getFilteredDiffUris = getFilteredDiffUris;
  }
});

// out/services/comparer.js
var require_comparer = __commonJS({
  "out/services/comparer.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __awaiter2 = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CompareResult = exports2.compareFolders = exports2.showFile = exports2.showDiffs = exports2.chooseFoldersAndCompare = void 0;
    var vscode_12 = require("vscode");
    var dir_compare_1 = require_src();
    var openFolder_1 = require_openFolder();
    var path = __importStar(require("path"));
    var configuration_12 = require_configuration();
    var path_1 = require_path();
    var ignoreExtensionTools_12 = require_ignoreExtensionTools();
    var logger_1 = require_logger();
    var ui_12 = require_ui();
    var validators_1 = require_validators();
    var includeExcludeFilesGetter_1 = require_includeExcludeFilesGetter();
    var gitignoreFilter_1 = require_gitignoreFilter();
    var customFileCompare_1 = require_customFileCompare();
    var ignorePatterns_1 = require_ignorePatterns();
    var filteredContentProvider_1 = require_filteredContentProvider();
    var diffMergeExtension = vscode_12.extensions.getExtension("moshfeu.diff-merge");
    function chooseFoldersAndCompare(path2) {
      return __awaiter2(this, void 0, void 0, function* () {
        const folder1Path = path2 || (yield (0, openFolder_1.openFolder)());
        const folder2Path = yield (0, openFolder_1.openFolder)();
        if (!folder1Path || !folder2Path) {
          return;
        }
        path_1.pathContext.setPaths(folder1Path, folder2Path);
        return compareFolders();
      });
    }
    exports2.chooseFoldersAndCompare = chooseFoldersAndCompare;
    function getTitle(path2, relativePath, titleFormat = (0, configuration_12.getConfiguration)("diffViewTitle")) {
      switch (titleFormat) {
        case "name only":
          return relativePath;
        case "compared path":
          return `${path2} \u2194 ${relativePath}`;
        default:
          return "";
      }
    }
    function showDiffs([file1, file2], relativePath) {
      return __awaiter2(this, void 0, void 0, function* () {
        if ((0, configuration_12.getConfiguration)("useDiffMerge")) {
          if (diffMergeExtension) {
            vscode_12.commands.executeCommand("diffMerge.compareSelected", vscode_12.Uri.file(file1), [
              vscode_12.Uri.file(file1),
              vscode_12.Uri.file(file2)
            ]);
          } else {
            vscode_12.window.showErrorMessage('In order to use "Diff & Merge" extension you should install / enable it');
          }
          return;
        } else {
          const { ignoreLinePatterns, ignoreCodePatterns, ignoreLineReplacement, ignoreLineDelete, ignoreLineEnding, ignoreAllWhiteSpaces, ignoreWhiteSpaces, ignoreEmptyLines } = (0, configuration_12.getConfiguration)("ignoreLinePatterns", "ignoreCodePatterns", "ignoreLineReplacement", "ignoreLineDelete", "ignoreLineEnding", "ignoreAllWhiteSpaces", "ignoreWhiteSpaces", "ignoreEmptyLines");
          const hasIgnorePatterns = ignoreLinePatterns && ignoreLinePatterns.length > 0 || ignoreCodePatterns && ignoreCodePatterns.length > 0;
          let leftUri = vscode_12.Uri.file(file1);
          let rightUri = vscode_12.Uri.file(file2);
          if (hasIgnorePatterns) {
            try {
              const filteredUris = yield (0, filteredContentProvider_1.getFilteredDiffUris)(file1, file2, {
                ignoreLineEnding,
                ignoreAllWhiteSpaces,
                ignoreWhiteSpaces,
                ignoreEmptyLines
              }, { ignoreLinePatterns, ignoreCodePatterns, ignoreLineReplacement, ignoreLineDelete });
              leftUri = filteredUris.left;
              rightUri = filteredUris.right;
            } catch (error) {
              (0, logger_1.log)("error while preparing filtered diff content, falling back to raw files", error);
            }
          }
          vscode_12.commands.executeCommand("vscode.diff", leftUri, rightUri, getTitle(file1, relativePath, (0, ignoreExtensionTools_12.compareIgnoredExtension)(file1, file2) ? "full path" : void 0));
        }
      });
    }
    exports2.showDiffs = showDiffs;
    function showFile(file) {
      return __awaiter2(this, void 0, void 0, function* () {
        vscode_12.commands.executeCommand("vscode.open", vscode_12.Uri.file(file));
      });
    }
    exports2.showFile = showFile;
    function getOptions() {
      const { compareContent, ignoreFileNameCase, ignoreExtension, ignoreWhiteSpaces, ignoreAllWhiteSpaces, ignoreEmptyLines, ignoreLineEnding, respectGitIgnore, ignoreLinePatterns, ignoreCodePatterns, ignoreLineReplacement, ignoreLineDelete } = (0, configuration_12.getConfiguration)("compareContent", "ignoreFileNameCase", "ignoreExtension", "ignoreWhiteSpaces", "ignoreAllWhiteSpaces", "ignoreEmptyLines", "ignoreLineEnding", "respectGitIgnore", "ignoreLinePatterns", "ignoreCodePatterns", "ignoreLineReplacement", "ignoreLineDelete");
      if (ignoreLinePatterns && ignoreLinePatterns.length > 0) {
        const validation = (0, ignorePatterns_1.validatePatterns)(ignoreLinePatterns);
        if (!validation.valid) {
          vscode_12.window.showWarningMessage(`Invalid ignore line patterns detected:
${validation.errors.join("\n")}`);
        }
      }
      if (ignoreCodePatterns && ignoreCodePatterns.length > 0) {
        const validation = (0, ignorePatterns_1.validatePatterns)(ignoreCodePatterns);
        if (!validation.valid) {
          vscode_12.window.showWarningMessage(`Invalid ignore code patterns detected:
${validation.errors.join("\n")}`);
        }
      }
      const { excludeFilter, includeFilter } = (0, includeExcludeFilesGetter_1.getIncludeAndExcludePaths)();
      const filterHandler = respectGitIgnore ? (0, gitignoreFilter_1.getGitignoreFilter)(...path_1.pathContext.getPaths()) : void 0;
      const hasIgnorePatterns = ignoreLinePatterns && ignoreLinePatterns.length > 0 || ignoreCodePatterns && ignoreCodePatterns.length > 0;
      const compareFileAsync = hasIgnorePatterns ? (0, customFileCompare_1.createCustomFileCompare)({
        ignoreLinePatterns,
        ignoreCodePatterns,
        ignoreLineReplacement,
        ignoreLineDelete
      }) : dir_compare_1.fileCompareHandlers.lineBasedFileCompare.compareAsync;
      const options = {
        compareContent,
        excludeFilter,
        includeFilter,
        ignoreCase: ignoreFileNameCase,
        ignoreExtension,
        ignoreWhiteSpaces,
        ignoreAllWhiteSpaces,
        ignoreEmptyLines,
        ignoreLineEnding,
        filterHandler,
        compareFileAsync,
        compareNameHandler: ignoreExtension && ignoreExtensionTools_12.compareName || void 0
      };
      return options;
    }
    function compareFolders() {
      return __awaiter2(this, void 0, void 0, function* () {
        const emptyResponse = () => Promise.resolve(new CompareResult([], [], [], [], [], "", ""));
        try {
          if (!(0, ignoreExtensionTools_12.validate)()) {
            return emptyResponse();
          }
          const [folder1Path, folder2Path] = path_1.pathContext.getPaths();
          (0, validators_1.validatePermissions)(folder1Path, folder2Path);
          const showIdentical = (0, configuration_12.getConfiguration)("showIdentical");
          const options = getOptions();
          const concatenatedOptions = Object.assign({ compareContent: true, handlePermissionDenied: true }, options);
          const res = yield (0, dir_compare_1.compare)(folder1Path, folder2Path, concatenatedOptions);
          (0, logger_1.printOptions)(options);
          (0, logger_1.printResult)(res);
          const { diffSet = [] } = res;
          const distinct = diffSet.filter((diff) => diff.state === "distinct").map((diff) => [path.join(diff.path1, diff.name1), path.join(diff.path2, diff.name2)]);
          const left = diffSet.filter((diff) => diff.state === "left" && diff.type1 === "file").map((diff) => [buildPath(diff, "1")]);
          const right = diffSet.filter((diff) => diff.state === "right" && diff.type2 === "file").map((diff) => [buildPath(diff, "2")]);
          const identicals = showIdentical ? diffSet.filter((diff) => diff.state === "equal" && diff.type1 === "file").map((diff) => [buildPath(diff, "1")]) : [];
          const unaccessibles = diffSet.filter((diff) => diff.permissionDeniedState !== "access-ok").map((diff) => buildPath(diff, diff.permissionDeniedState === "access-error-left" ? "1" : "2"));
          return new CompareResult(distinct, left, right, identicals, unaccessibles, folder1Path, folder2Path);
        } catch (error) {
          (0, logger_1.log)("error while comparing", error);
          (0, ui_12.showErrorMessage)("Oops, something went wrong while comparing", error);
          return emptyResponse();
        }
      });
    }
    exports2.compareFolders = compareFolders;
    function buildPath(diff, side) {
      if (!diff[`path${side}`] || !diff[`name${side}`]) {
        throw new Error("path or name is missing");
      }
      return path.join(diff[`path${side}`], diff[`name${side}`]);
    }
    var CompareResult = class {
      constructor(distinct, left, right, identicals, unaccessibles, leftPath, rightPath) {
        this.distinct = distinct;
        this.left = left;
        this.right = right;
        this.identicals = identicals;
        this.unaccessibles = unaccessibles;
        this.leftPath = leftPath;
        this.rightPath = rightPath;
      }
      hasResult() {
        return this.distinct.length || this.left.length || this.right.length;
      }
    };
    exports2.CompareResult = CompareResult;
  }
});

// out/models/file.js
var require_file2 = __commonJS({
  "out/models/file.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.File = void 0;
    var vscode_12 = require("vscode");
    var path_1 = require("path");
    var logger_1 = require_logger();
    var File = class extends vscode_12.TreeItem {
      constructor(label, type, collapsibleState, command, children, resourceUri, description, tooltip) {
        var _a, _b, _c;
        super(label, collapsibleState);
        this.label = label;
        this.type = type;
        this.collapsibleState = collapsibleState;
        this.command = command;
        this.children = children;
        this.resourceUri = resourceUri;
        this.description = description;
        this.tooltip = tooltip;
        this.iconPath = this.hasIcon ? {
          light: vscode_12.Uri.file((0, path_1.join)(__filename, "..", "..", "..", "resources", "light", `${this.type}.svg`)),
          dark: vscode_12.Uri.file((0, path_1.join)(__filename, "..", "..", "..", "resources", "dark", `${this.type}.svg`))
        } : void 0;
        this.contextValue = this.type;
        try {
          (_a = this.tooltip) !== null && _a !== void 0 ? _a : this.tooltip = ((_b = this.resourceUri) === null || _b === void 0 ? void 0 : _b.fsPath) || this.label;
          this.resourceUri = this.resourceUri || (this.hasIcon ? void 0 : vscode_12.Uri.file(((_c = this.command) === null || _c === void 0 ? void 0 : _c.arguments[0][0]) || ""));
        } catch (error) {
          (0, logger_1.log)(`can't set resourceUri: ${error}`);
        }
      }
      get hasIcon() {
        return ["open", "empty", "root"].includes(this.type);
      }
    };
    exports2.File = File;
  }
});

// node_modules/lodash/_freeGlobal.js
var require_freeGlobal = __commonJS({
  "node_modules/lodash/_freeGlobal.js"(exports2, module2) {
    var freeGlobal = typeof global == "object" && global && global.Object === Object && global;
    module2.exports = freeGlobal;
  }
});

// node_modules/lodash/_root.js
var require_root = __commonJS({
  "node_modules/lodash/_root.js"(exports2, module2) {
    var freeGlobal = require_freeGlobal();
    var freeSelf = typeof self == "object" && self && self.Object === Object && self;
    var root = freeGlobal || freeSelf || Function("return this")();
    module2.exports = root;
  }
});

// node_modules/lodash/_Symbol.js
var require_Symbol = __commonJS({
  "node_modules/lodash/_Symbol.js"(exports2, module2) {
    var root = require_root();
    var Symbol2 = root.Symbol;
    module2.exports = Symbol2;
  }
});

// node_modules/lodash/_getRawTag.js
var require_getRawTag = __commonJS({
  "node_modules/lodash/_getRawTag.js"(exports2, module2) {
    var Symbol2 = require_Symbol();
    var objectProto = Object.prototype;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var nativeObjectToString = objectProto.toString;
    var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    function getRawTag(value) {
      var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
      try {
        value[symToStringTag] = void 0;
        var unmasked = true;
      } catch (e) {
      }
      var result = nativeObjectToString.call(value);
      if (unmasked) {
        if (isOwn) {
          value[symToStringTag] = tag;
        } else {
          delete value[symToStringTag];
        }
      }
      return result;
    }
    module2.exports = getRawTag;
  }
});

// node_modules/lodash/_objectToString.js
var require_objectToString = __commonJS({
  "node_modules/lodash/_objectToString.js"(exports2, module2) {
    var objectProto = Object.prototype;
    var nativeObjectToString = objectProto.toString;
    function objectToString(value) {
      return nativeObjectToString.call(value);
    }
    module2.exports = objectToString;
  }
});

// node_modules/lodash/_baseGetTag.js
var require_baseGetTag = __commonJS({
  "node_modules/lodash/_baseGetTag.js"(exports2, module2) {
    var Symbol2 = require_Symbol();
    var getRawTag = require_getRawTag();
    var objectToString = require_objectToString();
    var nullTag = "[object Null]";
    var undefinedTag = "[object Undefined]";
    var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
    function baseGetTag(value) {
      if (value == null) {
        return value === void 0 ? undefinedTag : nullTag;
      }
      return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
    }
    module2.exports = baseGetTag;
  }
});

// node_modules/lodash/isObject.js
var require_isObject = __commonJS({
  "node_modules/lodash/isObject.js"(exports2, module2) {
    function isObject(value) {
      var type = typeof value;
      return value != null && (type == "object" || type == "function");
    }
    module2.exports = isObject;
  }
});

// node_modules/lodash/isFunction.js
var require_isFunction = __commonJS({
  "node_modules/lodash/isFunction.js"(exports2, module2) {
    var baseGetTag = require_baseGetTag();
    var isObject = require_isObject();
    var asyncTag = "[object AsyncFunction]";
    var funcTag = "[object Function]";
    var genTag = "[object GeneratorFunction]";
    var proxyTag = "[object Proxy]";
    function isFunction(value) {
      if (!isObject(value)) {
        return false;
      }
      var tag = baseGetTag(value);
      return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
    }
    module2.exports = isFunction;
  }
});

// node_modules/lodash/_coreJsData.js
var require_coreJsData = __commonJS({
  "node_modules/lodash/_coreJsData.js"(exports2, module2) {
    var root = require_root();
    var coreJsData = root["__core-js_shared__"];
    module2.exports = coreJsData;
  }
});

// node_modules/lodash/_isMasked.js
var require_isMasked = __commonJS({
  "node_modules/lodash/_isMasked.js"(exports2, module2) {
    var coreJsData = require_coreJsData();
    var maskSrcKey = function() {
      var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
      return uid ? "Symbol(src)_1." + uid : "";
    }();
    function isMasked(func) {
      return !!maskSrcKey && maskSrcKey in func;
    }
    module2.exports = isMasked;
  }
});

// node_modules/lodash/_toSource.js
var require_toSource = __commonJS({
  "node_modules/lodash/_toSource.js"(exports2, module2) {
    var funcProto = Function.prototype;
    var funcToString = funcProto.toString;
    function toSource(func) {
      if (func != null) {
        try {
          return funcToString.call(func);
        } catch (e) {
        }
        try {
          return func + "";
        } catch (e) {
        }
      }
      return "";
    }
    module2.exports = toSource;
  }
});

// node_modules/lodash/_baseIsNative.js
var require_baseIsNative = __commonJS({
  "node_modules/lodash/_baseIsNative.js"(exports2, module2) {
    var isFunction = require_isFunction();
    var isMasked = require_isMasked();
    var isObject = require_isObject();
    var toSource = require_toSource();
    var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
    var reIsHostCtor = /^\[object .+?Constructor\]$/;
    var funcProto = Function.prototype;
    var objectProto = Object.prototype;
    var funcToString = funcProto.toString;
    var hasOwnProperty = objectProto.hasOwnProperty;
    var reIsNative = RegExp(
      "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
    );
    function baseIsNative(value) {
      if (!isObject(value) || isMasked(value)) {
        return false;
      }
      var pattern = isFunction(value) ? reIsNative : reIsHostCtor;
      return pattern.test(toSource(value));
    }
    module2.exports = baseIsNative;
  }
});

// node_modules/lodash/_getValue.js
var require_getValue = __commonJS({
  "node_modules/lodash/_getValue.js"(exports2, module2) {
    function getValue(object, key) {
      return object == null ? void 0 : object[key];
    }
    module2.exports = getValue;
  }
});

// node_modules/lodash/_getNative.js
var require_getNative = __commonJS({
  "node_modules/lodash/_getNative.js"(exports2, module2) {
    var baseIsNative = require_baseIsNative();
    var getValue = require_getValue();
    function getNative(object, key) {
      var value = getValue(object, key);
      return baseIsNative(value) ? value : void 0;
    }
    module2.exports = getNative;
  }
});

// node_modules/lodash/_defineProperty.js
var require_defineProperty = __commonJS({
  "node_modules/lodash/_defineProperty.js"(exports2, module2) {
    var getNative = require_getNative();
    var defineProperty = function() {
      try {
        var func = getNative(Object, "defineProperty");
        func({}, "", {});
        return func;
      } catch (e) {
      }
    }();
    module2.exports = defineProperty;
  }
});

// node_modules/lodash/_baseAssignValue.js
var require_baseAssignValue = __commonJS({
  "node_modules/lodash/_baseAssignValue.js"(exports2, module2) {
    var defineProperty = require_defineProperty();
    function baseAssignValue(object, key, value) {
      if (key == "__proto__" && defineProperty) {
        defineProperty(object, key, {
          "configurable": true,
          "enumerable": true,
          "value": value,
          "writable": true
        });
      } else {
        object[key] = value;
      }
    }
    module2.exports = baseAssignValue;
  }
});

// node_modules/lodash/eq.js
var require_eq = __commonJS({
  "node_modules/lodash/eq.js"(exports2, module2) {
    function eq(value, other) {
      return value === other || value !== value && other !== other;
    }
    module2.exports = eq;
  }
});

// node_modules/lodash/_assignValue.js
var require_assignValue = __commonJS({
  "node_modules/lodash/_assignValue.js"(exports2, module2) {
    var baseAssignValue = require_baseAssignValue();
    var eq = require_eq();
    var objectProto = Object.prototype;
    var hasOwnProperty = objectProto.hasOwnProperty;
    function assignValue(object, key, value) {
      var objValue = object[key];
      if (!(hasOwnProperty.call(object, key) && eq(objValue, value)) || value === void 0 && !(key in object)) {
        baseAssignValue(object, key, value);
      }
    }
    module2.exports = assignValue;
  }
});

// node_modules/lodash/isArray.js
var require_isArray = __commonJS({
  "node_modules/lodash/isArray.js"(exports2, module2) {
    var isArray = Array.isArray;
    module2.exports = isArray;
  }
});

// node_modules/lodash/isObjectLike.js
var require_isObjectLike = __commonJS({
  "node_modules/lodash/isObjectLike.js"(exports2, module2) {
    function isObjectLike(value) {
      return value != null && typeof value == "object";
    }
    module2.exports = isObjectLike;
  }
});

// node_modules/lodash/isSymbol.js
var require_isSymbol = __commonJS({
  "node_modules/lodash/isSymbol.js"(exports2, module2) {
    var baseGetTag = require_baseGetTag();
    var isObjectLike = require_isObjectLike();
    var symbolTag = "[object Symbol]";
    function isSymbol(value) {
      return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
    }
    module2.exports = isSymbol;
  }
});

// node_modules/lodash/_isKey.js
var require_isKey = __commonJS({
  "node_modules/lodash/_isKey.js"(exports2, module2) {
    var isArray = require_isArray();
    var isSymbol = require_isSymbol();
    var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
    var reIsPlainProp = /^\w*$/;
    function isKey(value, object) {
      if (isArray(value)) {
        return false;
      }
      var type = typeof value;
      if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
        return true;
      }
      return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object != null && value in Object(object);
    }
    module2.exports = isKey;
  }
});

// node_modules/lodash/_nativeCreate.js
var require_nativeCreate = __commonJS({
  "node_modules/lodash/_nativeCreate.js"(exports2, module2) {
    var getNative = require_getNative();
    var nativeCreate = getNative(Object, "create");
    module2.exports = nativeCreate;
  }
});

// node_modules/lodash/_hashClear.js
var require_hashClear = __commonJS({
  "node_modules/lodash/_hashClear.js"(exports2, module2) {
    var nativeCreate = require_nativeCreate();
    function hashClear() {
      this.__data__ = nativeCreate ? nativeCreate(null) : {};
      this.size = 0;
    }
    module2.exports = hashClear;
  }
});

// node_modules/lodash/_hashDelete.js
var require_hashDelete = __commonJS({
  "node_modules/lodash/_hashDelete.js"(exports2, module2) {
    function hashDelete(key) {
      var result = this.has(key) && delete this.__data__[key];
      this.size -= result ? 1 : 0;
      return result;
    }
    module2.exports = hashDelete;
  }
});

// node_modules/lodash/_hashGet.js
var require_hashGet = __commonJS({
  "node_modules/lodash/_hashGet.js"(exports2, module2) {
    var nativeCreate = require_nativeCreate();
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    var objectProto = Object.prototype;
    var hasOwnProperty = objectProto.hasOwnProperty;
    function hashGet(key) {
      var data = this.__data__;
      if (nativeCreate) {
        var result = data[key];
        return result === HASH_UNDEFINED ? void 0 : result;
      }
      return hasOwnProperty.call(data, key) ? data[key] : void 0;
    }
    module2.exports = hashGet;
  }
});

// node_modules/lodash/_hashHas.js
var require_hashHas = __commonJS({
  "node_modules/lodash/_hashHas.js"(exports2, module2) {
    var nativeCreate = require_nativeCreate();
    var objectProto = Object.prototype;
    var hasOwnProperty = objectProto.hasOwnProperty;
    function hashHas(key) {
      var data = this.__data__;
      return nativeCreate ? data[key] !== void 0 : hasOwnProperty.call(data, key);
    }
    module2.exports = hashHas;
  }
});

// node_modules/lodash/_hashSet.js
var require_hashSet = __commonJS({
  "node_modules/lodash/_hashSet.js"(exports2, module2) {
    var nativeCreate = require_nativeCreate();
    var HASH_UNDEFINED = "__lodash_hash_undefined__";
    function hashSet(key, value) {
      var data = this.__data__;
      this.size += this.has(key) ? 0 : 1;
      data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
      return this;
    }
    module2.exports = hashSet;
  }
});

// node_modules/lodash/_Hash.js
var require_Hash = __commonJS({
  "node_modules/lodash/_Hash.js"(exports2, module2) {
    var hashClear = require_hashClear();
    var hashDelete = require_hashDelete();
    var hashGet = require_hashGet();
    var hashHas = require_hashHas();
    var hashSet = require_hashSet();
    function Hash(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    Hash.prototype.clear = hashClear;
    Hash.prototype["delete"] = hashDelete;
    Hash.prototype.get = hashGet;
    Hash.prototype.has = hashHas;
    Hash.prototype.set = hashSet;
    module2.exports = Hash;
  }
});

// node_modules/lodash/_listCacheClear.js
var require_listCacheClear = __commonJS({
  "node_modules/lodash/_listCacheClear.js"(exports2, module2) {
    function listCacheClear() {
      this.__data__ = [];
      this.size = 0;
    }
    module2.exports = listCacheClear;
  }
});

// node_modules/lodash/_assocIndexOf.js
var require_assocIndexOf = __commonJS({
  "node_modules/lodash/_assocIndexOf.js"(exports2, module2) {
    var eq = require_eq();
    function assocIndexOf(array, key) {
      var length = array.length;
      while (length--) {
        if (eq(array[length][0], key)) {
          return length;
        }
      }
      return -1;
    }
    module2.exports = assocIndexOf;
  }
});

// node_modules/lodash/_listCacheDelete.js
var require_listCacheDelete = __commonJS({
  "node_modules/lodash/_listCacheDelete.js"(exports2, module2) {
    var assocIndexOf = require_assocIndexOf();
    var arrayProto = Array.prototype;
    var splice = arrayProto.splice;
    function listCacheDelete(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        return false;
      }
      var lastIndex = data.length - 1;
      if (index == lastIndex) {
        data.pop();
      } else {
        splice.call(data, index, 1);
      }
      --this.size;
      return true;
    }
    module2.exports = listCacheDelete;
  }
});

// node_modules/lodash/_listCacheGet.js
var require_listCacheGet = __commonJS({
  "node_modules/lodash/_listCacheGet.js"(exports2, module2) {
    var assocIndexOf = require_assocIndexOf();
    function listCacheGet(key) {
      var data = this.__data__, index = assocIndexOf(data, key);
      return index < 0 ? void 0 : data[index][1];
    }
    module2.exports = listCacheGet;
  }
});

// node_modules/lodash/_listCacheHas.js
var require_listCacheHas = __commonJS({
  "node_modules/lodash/_listCacheHas.js"(exports2, module2) {
    var assocIndexOf = require_assocIndexOf();
    function listCacheHas(key) {
      return assocIndexOf(this.__data__, key) > -1;
    }
    module2.exports = listCacheHas;
  }
});

// node_modules/lodash/_listCacheSet.js
var require_listCacheSet = __commonJS({
  "node_modules/lodash/_listCacheSet.js"(exports2, module2) {
    var assocIndexOf = require_assocIndexOf();
    function listCacheSet(key, value) {
      var data = this.__data__, index = assocIndexOf(data, key);
      if (index < 0) {
        ++this.size;
        data.push([key, value]);
      } else {
        data[index][1] = value;
      }
      return this;
    }
    module2.exports = listCacheSet;
  }
});

// node_modules/lodash/_ListCache.js
var require_ListCache = __commonJS({
  "node_modules/lodash/_ListCache.js"(exports2, module2) {
    var listCacheClear = require_listCacheClear();
    var listCacheDelete = require_listCacheDelete();
    var listCacheGet = require_listCacheGet();
    var listCacheHas = require_listCacheHas();
    var listCacheSet = require_listCacheSet();
    function ListCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    ListCache.prototype.clear = listCacheClear;
    ListCache.prototype["delete"] = listCacheDelete;
    ListCache.prototype.get = listCacheGet;
    ListCache.prototype.has = listCacheHas;
    ListCache.prototype.set = listCacheSet;
    module2.exports = ListCache;
  }
});

// node_modules/lodash/_Map.js
var require_Map = __commonJS({
  "node_modules/lodash/_Map.js"(exports2, module2) {
    var getNative = require_getNative();
    var root = require_root();
    var Map2 = getNative(root, "Map");
    module2.exports = Map2;
  }
});

// node_modules/lodash/_mapCacheClear.js
var require_mapCacheClear = __commonJS({
  "node_modules/lodash/_mapCacheClear.js"(exports2, module2) {
    var Hash = require_Hash();
    var ListCache = require_ListCache();
    var Map2 = require_Map();
    function mapCacheClear() {
      this.size = 0;
      this.__data__ = {
        "hash": new Hash(),
        "map": new (Map2 || ListCache)(),
        "string": new Hash()
      };
    }
    module2.exports = mapCacheClear;
  }
});

// node_modules/lodash/_isKeyable.js
var require_isKeyable = __commonJS({
  "node_modules/lodash/_isKeyable.js"(exports2, module2) {
    function isKeyable(value) {
      var type = typeof value;
      return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
    }
    module2.exports = isKeyable;
  }
});

// node_modules/lodash/_getMapData.js
var require_getMapData = __commonJS({
  "node_modules/lodash/_getMapData.js"(exports2, module2) {
    var isKeyable = require_isKeyable();
    function getMapData(map, key) {
      var data = map.__data__;
      return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
    }
    module2.exports = getMapData;
  }
});

// node_modules/lodash/_mapCacheDelete.js
var require_mapCacheDelete = __commonJS({
  "node_modules/lodash/_mapCacheDelete.js"(exports2, module2) {
    var getMapData = require_getMapData();
    function mapCacheDelete(key) {
      var result = getMapData(this, key)["delete"](key);
      this.size -= result ? 1 : 0;
      return result;
    }
    module2.exports = mapCacheDelete;
  }
});

// node_modules/lodash/_mapCacheGet.js
var require_mapCacheGet = __commonJS({
  "node_modules/lodash/_mapCacheGet.js"(exports2, module2) {
    var getMapData = require_getMapData();
    function mapCacheGet(key) {
      return getMapData(this, key).get(key);
    }
    module2.exports = mapCacheGet;
  }
});

// node_modules/lodash/_mapCacheHas.js
var require_mapCacheHas = __commonJS({
  "node_modules/lodash/_mapCacheHas.js"(exports2, module2) {
    var getMapData = require_getMapData();
    function mapCacheHas(key) {
      return getMapData(this, key).has(key);
    }
    module2.exports = mapCacheHas;
  }
});

// node_modules/lodash/_mapCacheSet.js
var require_mapCacheSet = __commonJS({
  "node_modules/lodash/_mapCacheSet.js"(exports2, module2) {
    var getMapData = require_getMapData();
    function mapCacheSet(key, value) {
      var data = getMapData(this, key), size = data.size;
      data.set(key, value);
      this.size += data.size == size ? 0 : 1;
      return this;
    }
    module2.exports = mapCacheSet;
  }
});

// node_modules/lodash/_MapCache.js
var require_MapCache = __commonJS({
  "node_modules/lodash/_MapCache.js"(exports2, module2) {
    var mapCacheClear = require_mapCacheClear();
    var mapCacheDelete = require_mapCacheDelete();
    var mapCacheGet = require_mapCacheGet();
    var mapCacheHas = require_mapCacheHas();
    var mapCacheSet = require_mapCacheSet();
    function MapCache(entries) {
      var index = -1, length = entries == null ? 0 : entries.length;
      this.clear();
      while (++index < length) {
        var entry = entries[index];
        this.set(entry[0], entry[1]);
      }
    }
    MapCache.prototype.clear = mapCacheClear;
    MapCache.prototype["delete"] = mapCacheDelete;
    MapCache.prototype.get = mapCacheGet;
    MapCache.prototype.has = mapCacheHas;
    MapCache.prototype.set = mapCacheSet;
    module2.exports = MapCache;
  }
});

// node_modules/lodash/memoize.js
var require_memoize = __commonJS({
  "node_modules/lodash/memoize.js"(exports2, module2) {
    var MapCache = require_MapCache();
    var FUNC_ERROR_TEXT = "Expected a function";
    function memoize(func, resolver) {
      if (typeof func != "function" || resolver != null && typeof resolver != "function") {
        throw new TypeError(FUNC_ERROR_TEXT);
      }
      var memoized = function() {
        var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
        if (cache.has(key)) {
          return cache.get(key);
        }
        var result = func.apply(this, args);
        memoized.cache = cache.set(key, result) || cache;
        return result;
      };
      memoized.cache = new (memoize.Cache || MapCache)();
      return memoized;
    }
    memoize.Cache = MapCache;
    module2.exports = memoize;
  }
});

// node_modules/lodash/_memoizeCapped.js
var require_memoizeCapped = __commonJS({
  "node_modules/lodash/_memoizeCapped.js"(exports2, module2) {
    var memoize = require_memoize();
    var MAX_MEMOIZE_SIZE = 500;
    function memoizeCapped(func) {
      var result = memoize(func, function(key) {
        if (cache.size === MAX_MEMOIZE_SIZE) {
          cache.clear();
        }
        return key;
      });
      var cache = result.cache;
      return result;
    }
    module2.exports = memoizeCapped;
  }
});

// node_modules/lodash/_stringToPath.js
var require_stringToPath = __commonJS({
  "node_modules/lodash/_stringToPath.js"(exports2, module2) {
    var memoizeCapped = require_memoizeCapped();
    var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
    var reEscapeChar = /\\(\\)?/g;
    var stringToPath = memoizeCapped(function(string) {
      var result = [];
      if (string.charCodeAt(0) === 46) {
        result.push("");
      }
      string.replace(rePropName, function(match, number, quote, subString) {
        result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
      });
      return result;
    });
    module2.exports = stringToPath;
  }
});

// node_modules/lodash/_arrayMap.js
var require_arrayMap = __commonJS({
  "node_modules/lodash/_arrayMap.js"(exports2, module2) {
    function arrayMap(array, iteratee) {
      var index = -1, length = array == null ? 0 : array.length, result = Array(length);
      while (++index < length) {
        result[index] = iteratee(array[index], index, array);
      }
      return result;
    }
    module2.exports = arrayMap;
  }
});

// node_modules/lodash/_baseToString.js
var require_baseToString = __commonJS({
  "node_modules/lodash/_baseToString.js"(exports2, module2) {
    var Symbol2 = require_Symbol();
    var arrayMap = require_arrayMap();
    var isArray = require_isArray();
    var isSymbol = require_isSymbol();
    var INFINITY = 1 / 0;
    var symbolProto = Symbol2 ? Symbol2.prototype : void 0;
    var symbolToString = symbolProto ? symbolProto.toString : void 0;
    function baseToString(value) {
      if (typeof value == "string") {
        return value;
      }
      if (isArray(value)) {
        return arrayMap(value, baseToString) + "";
      }
      if (isSymbol(value)) {
        return symbolToString ? symbolToString.call(value) : "";
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    module2.exports = baseToString;
  }
});

// node_modules/lodash/toString.js
var require_toString = __commonJS({
  "node_modules/lodash/toString.js"(exports2, module2) {
    var baseToString = require_baseToString();
    function toString(value) {
      return value == null ? "" : baseToString(value);
    }
    module2.exports = toString;
  }
});

// node_modules/lodash/_castPath.js
var require_castPath = __commonJS({
  "node_modules/lodash/_castPath.js"(exports2, module2) {
    var isArray = require_isArray();
    var isKey = require_isKey();
    var stringToPath = require_stringToPath();
    var toString = require_toString();
    function castPath(value, object) {
      if (isArray(value)) {
        return value;
      }
      return isKey(value, object) ? [value] : stringToPath(toString(value));
    }
    module2.exports = castPath;
  }
});

// node_modules/lodash/_isIndex.js
var require_isIndex = __commonJS({
  "node_modules/lodash/_isIndex.js"(exports2, module2) {
    var MAX_SAFE_INTEGER = 9007199254740991;
    var reIsUint = /^(?:0|[1-9]\d*)$/;
    function isIndex(value, length) {
      var type = typeof value;
      length = length == null ? MAX_SAFE_INTEGER : length;
      return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
    }
    module2.exports = isIndex;
  }
});

// node_modules/lodash/_toKey.js
var require_toKey = __commonJS({
  "node_modules/lodash/_toKey.js"(exports2, module2) {
    var isSymbol = require_isSymbol();
    var INFINITY = 1 / 0;
    function toKey(value) {
      if (typeof value == "string" || isSymbol(value)) {
        return value;
      }
      var result = value + "";
      return result == "0" && 1 / value == -INFINITY ? "-0" : result;
    }
    module2.exports = toKey;
  }
});

// node_modules/lodash/_baseSet.js
var require_baseSet = __commonJS({
  "node_modules/lodash/_baseSet.js"(exports2, module2) {
    var assignValue = require_assignValue();
    var castPath = require_castPath();
    var isIndex = require_isIndex();
    var isObject = require_isObject();
    var toKey = require_toKey();
    function baseSet(object, path, value, customizer) {
      if (!isObject(object)) {
        return object;
      }
      path = castPath(path, object);
      var index = -1, length = path.length, lastIndex = length - 1, nested = object;
      while (nested != null && ++index < length) {
        var key = toKey(path[index]), newValue = value;
        if (key === "__proto__" || key === "constructor" || key === "prototype") {
          return object;
        }
        if (index != lastIndex) {
          var objValue = nested[key];
          newValue = customizer ? customizer(objValue, key, nested) : void 0;
          if (newValue === void 0) {
            newValue = isObject(objValue) ? objValue : isIndex(path[index + 1]) ? [] : {};
          }
        }
        assignValue(nested, key, newValue);
        nested = nested[key];
      }
      return object;
    }
    module2.exports = baseSet;
  }
});

// node_modules/lodash/set.js
var require_set = __commonJS({
  "node_modules/lodash/set.js"(exports2, module2) {
    var baseSet = require_baseSet();
    function set(object, path, value) {
      return object == null ? object : baseSet(object, path, value);
    }
    module2.exports = set;
  }
});

// node_modules/lodash/_baseGet.js
var require_baseGet = __commonJS({
  "node_modules/lodash/_baseGet.js"(exports2, module2) {
    var castPath = require_castPath();
    var toKey = require_toKey();
    function baseGet(object, path) {
      path = castPath(path, object);
      var index = 0, length = path.length;
      while (object != null && index < length) {
        object = object[toKey(path[index++])];
      }
      return index && index == length ? object : void 0;
    }
    module2.exports = baseGet;
  }
});

// node_modules/lodash/get.js
var require_get = __commonJS({
  "node_modules/lodash/get.js"(exports2, module2) {
    var baseGet = require_baseGet();
    function get(object, path, defaultValue) {
      var result = object == null ? void 0 : baseGet(object, path);
      return result === void 0 ? defaultValue : result;
    }
    module2.exports = get;
  }
});

// out/context/global.js
var require_global = __commonJS({
  "out/context/global.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.setContext = void 0;
    var vscode_12 = require("vscode");
    var setContext = (key, value) => {
      vscode_12.commands.executeCommand("setContext", key, value);
    };
    exports2.setContext = setContext;
  }
});

// out/context/ui.js
var require_ui2 = __commonJS({
  "out/context/ui.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.uiContext = void 0;
    var configuration_12 = require_configuration();
    var global_1 = require_global();
    var UIContext = class {
      init() {
        this.updateFromConfiguration();
      }
      updateFromConfiguration() {
        if (this._diffViewMode) {
          return;
        }
        this.diffViewMode = (0, configuration_12.getConfiguration)("defaultDiffViewMode");
      }
      set diffViewMode(mode) {
        (0, global_1.setContext)("foldersCompare.diffViewMode", mode);
        this._diffViewMode = mode;
      }
      get diffViewMode() {
        return this._diffViewMode || (0, configuration_12.getConfiguration)("defaultDiffViewMode");
      }
    };
    exports2.uiContext = new UIContext();
  }
});

// out/services/treeBuilder.js
var require_treeBuilder = __commonJS({
  "out/services/treeBuilder.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __rest = exports2 && exports2.__rest || function(s, e) {
      var t = {};
      for (var p in s)
        if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    var __importDefault = exports2 && exports2.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.build = void 0;
    var vscode_12 = require("vscode");
    var set_1 = __importDefault(require_set());
    var get_1 = __importDefault(require_get());
    var commands_12 = require_commands();
    var file_1 = require_file2();
    var path = __importStar(require("path"));
    var ui_12 = require_ui2();
    var logger_1 = require_logger();
    function build(paths, basePath) {
      if (ui_12.uiContext.diffViewMode === "list") {
        return {
          tree: {},
          treeItems: createList(paths, basePath)
        };
      }
      const tree = {};
      try {
        paths.forEach((filePath) => {
          const relativePath = path.relative(basePath, filePath[0]);
          const segments = relativePath.split(path.sep);
          const fileSegment = segments.pop();
          segments.reduce((prev, current) => {
            prev.push(current);
            if (!(0, get_1.default)(tree, prev)) {
              (0, set_1.default)(tree, prev, {
                path: path.join(basePath, ...prev)
              });
            }
            return prev;
          }, []);
          (0, set_1.default)(tree, [...segments, fileSegment], [filePath, relativePath]);
        });
      } catch (error) {
        (0, logger_1.log)(`can't build the tree: ${error}`);
      } finally {
        const treeItems = createHierarchy(tree);
        return { tree, treeItems };
      }
    }
    exports2.build = build;
    function createList(paths, basePath) {
      try {
        return paths.map(([path1, path2]) => {
          const relativePath = path.relative(basePath, path1);
          const fileName = path.basename(path1);
          return new file_1.File(fileName, "file", vscode_12.TreeItemCollapsibleState.None, {
            title: path1,
            command: commands_12.COMPARE_FILES,
            arguments: [[path1, path2 || ""], relativePath]
          }, void 0, vscode_12.Uri.file(path1), true);
        });
      } catch (error) {
        (0, logger_1.log)(`can't create list`, error);
        return [];
      }
    }
    function createHierarchy(src) {
      const children = Object.entries(src).reduce((prev, [key, childrenOrFileData]) => {
        if (childrenOrFileData.path) {
          const { path: path2 } = childrenOrFileData, children2 = __rest(childrenOrFileData, ["path"]);
          prev.push(new file_1.File(key, "folder", vscode_12.TreeItemCollapsibleState.Collapsed, void 0, createHierarchy(children2), vscode_12.Uri.file(path2)));
        } else {
          const [paths, relativePath] = childrenOrFileData;
          prev.push(new file_1.File(key, "file", vscode_12.TreeItemCollapsibleState.None, {
            title: key,
            command: commands_12.COMPARE_FILES,
            arguments: [paths, relativePath]
          }, void 0, vscode_12.Uri.file(paths[0])));
        }
        return prev;
      }, []);
      return children;
    }
  }
});

// out/utils/path.js
var require_path2 = __commonJS({
  "out/utils/path.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.getLocalPath = void 0;
    function getLocalPath(path, basePath) {
      return path.replace(basePath, "");
    }
    exports2.getLocalPath = getLocalPath;
  }
});

// out/constants/contextKeys.js
var require_contextKeys = __commonJS({
  "out/constants/contextKeys.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.FILES_VIEW_MODE = exports2.HAS_FOLDERS = void 0;
    exports2.HAS_FOLDERS = "foldersCompareContext.hasFolders";
    exports2.FILES_VIEW_MODE = "foldersCompare.diffViewMode";
  }
});

// out/providers/foldersCompareProvider.js
var require_foldersCompareProvider = __commonJS({
  "out/providers/foldersCompareProvider.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    } : function(o, m, k, k2) {
      if (k2 === void 0)
        k2 = k;
      o[k2] = m[k];
    });
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    } : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule)
        return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __awaiter2 = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.CompareFoldersProvider = void 0;
    var vscode_12 = require("vscode");
    var path = __importStar(require("path"));
    var fs_extra_1 = require_lib();
    var commands_12 = require_commands();
    var comparer_1 = require_comparer();
    var file_1 = require_file2();
    var treeBuilder_1 = require_treeBuilder();
    var path_1 = require_path();
    var path_2 = require_path2();
    var configuration_12 = require_configuration();
    var global_1 = require_global();
    var contextKeys_1 = require_contextKeys();
    var logger = __importStar(require_logger());
    var ui_12 = require_ui();
    var validators_1 = require_validators();
    var ui_22 = require_ui2();
    var CompareFoldersProvider = class {
      constructor(onlyInA, onlyInB, identicals) {
        this.onlyInA = onlyInA;
        this.onlyInB = onlyInB;
        this.identicals = identicals;
        this._onDidChangeTreeData = new vscode_12.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.emptyState = false;
        this._diffs = null;
        this.ignoreDifferencesList = /* @__PURE__ */ new Set();
        this.compareFoldersAgainstEachOther = () => __awaiter2(this, void 0, void 0, function* () {
          yield this.chooseFoldersAndCompare(true);
        });
        this.compareSelectedFolders = (_e, uris) => __awaiter2(this, void 0, void 0, function* () {
          if ((uris === null || uris === void 0 ? void 0 : uris.length) !== 2) {
            (0, ui_12.showErrorMessageWithMoreInfo)("Unfortunately, this command can run only by right clicking on 2 folders, no shortcuts here \u{1F615}", "https://github.com/microsoft/vscode/issues/3553");
            return;
          }
          const [{ fsPath: folder1Path }, { fsPath: folder2Path }] = uris;
          path_1.pathContext.setPaths(folder1Path, folder2Path);
          return this.handleDiffResult(yield (0, comparer_1.compareFolders)());
        });
        this.dismissDifference = (e) => __awaiter2(this, void 0, void 0, function* () {
          const { path: path2 } = e.resourceUri || {};
          if (!path2) {
            return;
          }
          this.ignoreDifferencesList.add(path2);
          this.filterIgnoredFromDiffs();
          yield this.updateUI();
        });
        this.chooseFoldersAndCompare = (ignoreWorkspace = false) => __awaiter2(this, void 0, void 0, function* () {
          yield vscode_12.window.withProgress({
            location: vscode_12.ProgressLocation.Notification,
            title: `Compare folders...`
          }, () => __awaiter2(this, void 0, void 0, function* () {
            this.handleDiffResult(yield (0, comparer_1.chooseFoldersAndCompare)(ignoreWorkspace ? void 0 : yield this.getWorkspaceFolder()));
          }));
        });
        this.getWorkspaceFolder = () => __awaiter2(this, void 0, void 0, function* () {
          if (!vscode_12.workspace.workspaceFolders) {
            return Promise.resolve(void 0);
          }
          if (vscode_12.workspace.workspaceFolders && vscode_12.workspace.workspaceFolders.length === 1) {
            return Promise.resolve(this.workspaceRoot);
          } else {
            const selectedWorkspace = yield this.chooseWorkspace();
            if (!selectedWorkspace) {
              throw new Error("Workspace not selected");
            }
            return selectedWorkspace;
          }
        });
        this.chooseWorkspace = () => __awaiter2(this, void 0, void 0, function* () {
          const workspaces = vscode_12.workspace.workspaceFolders.map((folder) => ({
            label: folder.name,
            description: folder.uri.fsPath
          }));
          const result = yield vscode_12.window.showQuickPick(workspaces, {
            canPickMany: false,
            placeHolder: "Choose a workspace to compare with"
          });
          if (result) {
            this.workspaceRoot = result.description;
            return this.workspaceRoot;
          }
        });
        this.refresh = (resetIgnoredFiles = true, shouldShowInfoMessage = true) => __awaiter2(this, void 0, void 0, function* () {
          if (resetIgnoredFiles) {
            this.ignoreDifferencesList.clear();
          }
          try {
            this._diffs = yield (0, comparer_1.compareFolders)();
            this.filterIgnoredFromDiffs();
            if (shouldShowInfoMessage && this._diffs.hasResult()) {
              (0, ui_12.showInfoMessageWithTimeout)("Source Refreshed");
            }
            this.updateUI();
          } catch (error) {
            logger.error(error);
          }
        });
        this.swap = () => {
          path_1.pathContext.swap();
          this.refresh(false);
        };
        this.viewAs = (mode) => () => {
          ui_22.uiContext.diffViewMode = mode;
          this.refresh(false, false);
        };
        this.copyToCompared = (e) => {
          this.copyToFolder(e.resourceUri, "to-compared");
        };
        this.copyToMy = (e) => {
          this.copyToFolder(e.resourceUri, "to-me");
        };
        this.deleteFile = (e) => __awaiter2(this, void 0, void 0, function* () {
          const shouldDelete = yield (0, ui_12.warnBefore)("Are you sure you want to delete this file?");
          if (shouldDelete) {
            (0, fs_extra_1.removeSync)(e.resourceUri.fsPath);
            this.refresh(false);
          }
        });
        this.takeMyFile = (e) => __awaiter2(this, void 0, void 0, function* () {
          const shouldTake = yield (0, ui_12.warnBefore)("Are you sure you want to take my file?");
          if (shouldTake) {
            const [[filePath]] = e.command.arguments;
            this.copyToFolder(vscode_12.Uri.file(filePath), "to-compared");
          }
        });
        this.takeComparedFile = (e) => __awaiter2(this, void 0, void 0, function* () {
          const shouldTake = yield (0, ui_12.warnBefore)("Are you sure you want to take the compared file?");
          if (shouldTake) {
            const [[, filePath]] = e.command.arguments;
            this.copyToFolder(vscode_12.Uri.file(filePath), "to-me");
          }
        });
        this.workspaceRoot = vscode_12.workspace.workspaceFolders && vscode_12.workspace.workspaceFolders.length ? vscode_12.workspace.workspaceFolders[0].uri.fsPath : "";
      }
      handleDiffResult(diffs) {
        return __awaiter2(this, void 0, void 0, function* () {
          this.ignoreDifferencesList.clear();
          if (!diffs) {
            return;
          }
          this._diffs = diffs;
          yield this.updateUI();
          this.warnUnaccessiblePaths();
          vscode_12.commands.executeCommand("foldersCompareAppService.focus");
          (0, global_1.setContext)(contextKeys_1.HAS_FOLDERS, true);
        });
      }
      warnUnaccessiblePaths() {
        var _a;
        if (!((_a = this._diffs) === null || _a === void 0 ? void 0 : _a.unaccessibles.length)) {
          return;
        }
        (0, validators_1.showUnaccessibleWarning)(this._diffs.unaccessibles.join("\n"));
      }
      onFileClicked([path1, path2], relativePath) {
        try {
          if (path2) {
            let diffs = [path2, path1];
            if ((0, configuration_12.getConfiguration)("diffLayout") === "local <> compared") {
              diffs = [path1, path2];
            }
            (0, comparer_1.showDiffs)(diffs, relativePath);
          } else {
            (0, comparer_1.showFile)(path1);
          }
        } catch (error) {
          console.error(error);
        }
      }
      updateUI() {
        return __awaiter2(this, void 0, void 0, function* () {
          if (!this._diffs) {
            return;
          }
          if (this._diffs.hasResult()) {
            this.emptyState = false;
            this._onDidChangeTreeData.fire(null);
          } else {
            this.showEmptyState();
            vscode_12.window.showInformationMessage("[Compare Folders] There are no differences in any file at the same path.");
          }
          this.onlyInA.update(this._diffs.left, this._diffs.leftPath);
          this.onlyInB.update(this._diffs.right, this._diffs.rightPath);
          this.identicals.update(this._diffs.identicals, this._diffs.leftPath);
        });
      }
      filterIgnoredFromDiffs() {
        this._diffs.distinct = this._diffs.distinct.filter((diff) => {
          const path1 = diff[0];
          const path2 = diff[1];
          return !this.ignoreDifferencesList.has(path1) && !this.ignoreDifferencesList.has(path2);
        });
      }
      copyToFolder(uri, direction) {
        try {
          const [folder1Path, folder2Path] = path_1.pathContext.getPaths();
          const [from, to] = direction === "to-compared" ? [folder1Path, folder2Path] : [folder2Path, folder1Path];
          const fromPath = uri.fsPath;
          const toPath = path.join(to, path.relative(from, fromPath));
          (0, fs_extra_1.copySync)(fromPath, toPath);
          this.refresh(false);
        } catch (error) {
          (0, ui_12.showErrorMessage)("Failed to copy file", error);
          logger.error(error);
        }
      }
      showEmptyState() {
        this.emptyState = true;
        this._onDidChangeTreeData.fire(null);
      }
      getTreeItem(element) {
        return element;
      }
      getFolderName(filePath, basePath) {
        const base = basePath ? `${this.workspaceRoot}/${basePath}` : this.workspaceRoot;
        return path.basename(path.dirname((0, path_2.getLocalPath)(filePath, base)));
      }
      getChildren(element) {
        try {
          if (element && element.children) {
            return element.children;
          }
          const children = [openFolderChild(!!this.workspaceRoot)];
          if (this.emptyState) {
            children.push(emptyStateChild);
          } else if (this._diffs) {
            const tree = (0, treeBuilder_1.build)(this._diffs.distinct, path_1.pathContext.mainPath);
            children.push(...tree.treeItems);
          }
          return children;
        } catch (error) {
          logger.error(error);
          return [];
        }
      }
    };
    exports2.CompareFoldersProvider = CompareFoldersProvider;
    var openFolderChild = (isSingle) => new file_1.File(isSingle ? "Click to select a folder" : "Click to select folders", "open", vscode_12.TreeItemCollapsibleState.None, {
      title: "title",
      command: commands_12.CHOOSE_FOLDERS_AND_COMPARE
    });
    var emptyStateChild = new file_1.File("The compared folders are synchronized", "empty", vscode_12.TreeItemCollapsibleState.None);
  }
});

// out/providers/viewOnlyProvider.js
var require_viewOnlyProvider = __commonJS({
  "out/providers/viewOnlyProvider.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ViewOnlyProvider = void 0;
    var vscode_12 = require("vscode");
    var file_1 = require_file2();
    var treeBuilder_1 = require_treeBuilder();
    var ViewOnlyProvider = class {
      constructor(showPath = true) {
        this.showPath = showPath;
        this._onDidChangeTreeData = new vscode_12.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.diffs = [];
        this.rootPath = "";
      }
      update(diffs, rootPath) {
        this.diffs = diffs;
        this.rootPath = rootPath;
        this._onDidChangeTreeData.fire(null);
      }
      getTreeItem(element) {
        return element;
      }
      getChildren(element) {
        if (element && element.children) {
          return element.children;
        }
        const { treeItems } = (0, treeBuilder_1.build)(this.diffs, this.rootPath);
        let children = [];
        if (this.rootPath && this.showPath) {
          children = [
            new file_1.File(this.rootPath, "root", vscode_12.TreeItemCollapsibleState.Expanded, void 0, treeItems)
          ];
        } else {
          children = treeItems;
        }
        return children;
      }
    };
    exports2.ViewOnlyProvider = ViewOnlyProvider;
  }
});

// out/services/pickFromRecentCompares.js
var require_pickFromRecentCompares = __commonJS({
  "out/services/pickFromRecentCompares.js"(exports2) {
    "use strict";
    var __awaiter2 = exports2 && exports2.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.pickFromRecents = void 0;
    var vscode_12 = require("vscode");
    var globalState_12 = require_globalState();
    var ui_12 = require_ui();
    var commands_12 = require_commands();
    var logger_1 = require_logger();
    function pickFromRecents() {
      return __awaiter2(this, void 0, void 0, function* () {
        const paths = globalState_12.globalState.getPaths();
        if (!(paths === null || paths === void 0 ? void 0 : paths.length)) {
          (0, ui_12.showInfoMessageWithTimeout)("History is empty");
          return;
        }
        const chosen = yield vscode_12.window.showQuickPick(Array.from(paths), {
          placeHolder: "Pick from history"
        });
        if (!chosen) {
          return;
        }
        const URIs = chosen.split(globalState_12.SEPERATOR).map((path) => ({
          fsPath: path
        }));
        try {
          yield vscode_12.commands.executeCommand(commands_12.COMPARE_SELECTED_FOLDERS, void 0, URIs);
        } catch (error) {
          (0, logger_1.log)(`failed to run COMPARE_SELECTED_FOLDERS because ${error}`);
        }
      });
    }
    exports2.pickFromRecents = pickFromRecents;
  }
});

// out/extension.js
var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
  function adopt(value) {
    return value instanceof P ? value : new P(function(resolve) {
      resolve(value);
    });
  }
  return new (P || (P = Promise))(function(resolve, reject) {
    function fulfilled(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    }
    function rejected(value) {
      try {
        step(generator["throw"](value));
      } catch (e) {
        reject(e);
      }
    }
    function step(result) {
      result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
    }
    step((generator = generator.apply(thisArg, _arguments || [])).next());
  });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
var vscode_1 = require("vscode");
var foldersCompareProvider_1 = require_foldersCompareProvider();
var commands_1 = require_commands();
var viewOnlyProvider_1 = require_viewOnlyProvider();
var globalState_1 = require_globalState();
var pickFromRecentCompares_1 = require_pickFromRecentCompares();
var configuration_1 = require_configuration();
var ui_1 = require_ui();
var ignoreExtensionTools_1 = require_ignoreExtensionTools();
var ui_2 = require_ui2();
function activate(context) {
  var _a, _b;
  return __awaiter(this, void 0, void 0, function* () {
    globalState_1.globalState.init(context);
    ui_2.uiContext.init();
    const onlyInA = new viewOnlyProvider_1.ViewOnlyProvider();
    const onlyInB = new viewOnlyProvider_1.ViewOnlyProvider();
    const identicals = new viewOnlyProvider_1.ViewOnlyProvider(false);
    const foldersCompareProvider = new foldersCompareProvider_1.CompareFoldersProvider(onlyInA, onlyInB, identicals);
    context.subscriptions.push(vscode_1.window.registerTreeDataProvider("foldersCompareAppService", foldersCompareProvider), vscode_1.window.registerTreeDataProvider("foldersCompareAppServiceOnlyA", onlyInA), vscode_1.window.registerTreeDataProvider("foldersCompareAppServiceOnlyB", onlyInB), vscode_1.window.registerTreeDataProvider("foldersCompareAppServiceIdenticals", identicals), vscode_1.commands.registerCommand(commands_1.COMPARE_FILES, foldersCompareProvider.onFileClicked), vscode_1.commands.registerCommand(commands_1.CHOOSE_FOLDERS_AND_COMPARE, foldersCompareProvider.chooseFoldersAndCompare), vscode_1.commands.registerCommand(commands_1.COMPARE_FOLDERS_AGAINST_EACH_OTHER, foldersCompareProvider.compareFoldersAgainstEachOther), vscode_1.commands.registerCommand(commands_1.COMPARE_FOLDERS_AGAINST_WORKSPACE, foldersCompareProvider.chooseFoldersAndCompare), vscode_1.commands.registerCommand(commands_1.COMPARE_SELECTED_FOLDERS, foldersCompareProvider.compareSelectedFolders), vscode_1.commands.registerCommand(commands_1.DISMISS_DIFFERENCE, foldersCompareProvider.dismissDifference), vscode_1.commands.registerCommand(commands_1.REFRESH, foldersCompareProvider.refresh), vscode_1.commands.registerCommand(commands_1.SWAP, foldersCompareProvider.swap), vscode_1.commands.registerCommand(commands_1.VIEW_AS_LIST, foldersCompareProvider.viewAs("list")), vscode_1.commands.registerCommand(commands_1.VIEW_AS_TREE, foldersCompareProvider.viewAs("tree")), vscode_1.commands.registerCommand(commands_1.COPY_TO_COMPARED, foldersCompareProvider.copyToCompared), vscode_1.commands.registerCommand(commands_1.COPY_TO_MY, foldersCompareProvider.copyToMy), vscode_1.commands.registerCommand(commands_1.TAKE_MY_FILE, foldersCompareProvider.takeMyFile), vscode_1.commands.registerCommand(commands_1.TAKE_COMPARED_FILE, foldersCompareProvider.takeComparedFile), vscode_1.commands.registerCommand(commands_1.DELETE_FILE, foldersCompareProvider.deleteFile), vscode_1.commands.registerCommand(commands_1.PICK_FROM_RECENT_COMPARES, pickFromRecentCompares_1.pickFromRecents), vscode_1.commands.registerCommand(commands_1.CLEAR_RECENT_COMPARES, globalState_1.globalState.clear));
    const { folderLeft, folderRight } = (0, configuration_1.getConfiguration)("folderLeft", "folderRight", "ignoreExtension");
    if (folderLeft || folderRight) {
      if (!folderLeft || !folderRight) {
        vscode_1.window.showInformationMessage(`In order to compare folders, the command should have been called with 2 folderLeft and folderRight settings`);
        return;
      }
      const folderLeftUri = vscode_1.Uri.file(folderLeft);
      const folderRightUri = vscode_1.Uri.file(folderRight);
      (0, ui_1.showDoneableInfo)(`Please wait, comparing folder ${folderLeft}-->${folderRight}`, () => foldersCompareProvider.compareSelectedFolders(folderLeftUri, [folderLeftUri, folderRightUri]));
    } else if (process.env.COMPARE_FOLDERS === "DIFF") {
      if (((_a = vscode_1.workspace.workspaceFolders) === null || _a === void 0 ? void 0 : _a.length) !== 2) {
        vscode_1.window.showInformationMessage(`In order to compare folders, the command should been called with 2 folders: e.g. COMPARE_FOLDERS=DIFF code path/to/folder1 path/to/folder2. Actual folders: ${((_b = vscode_1.workspace.workspaceFolders) === null || _b === void 0 ? void 0 : _b.length) || 0}`);
        return;
      }
      const [folder1Path, folder2Path] = vscode_1.workspace.workspaceFolders.map((folder) => folder.uri);
      foldersCompareProvider.compareSelectedFolders(folder1Path, [folder1Path, folder2Path]);
    }
    (0, ignoreExtensionTools_1.validate)();
  });
}
exports.activate = activate;
/*! Bundled license information:

lodash/lodash.js:
  (**
   * @license
   * Lodash <https://lodash.com/>
   * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   *)
*/
//# sourceMappingURL=extension.js.map
