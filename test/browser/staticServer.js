'use strict';

const fs = require('fs');
const http = require('http');
const path = require('path');

const createServer = (PORT) =>
  http
    .createServer(async (req, res) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=UTF-8' });
        fs.createReadStream(path.resolve('./test/browser/testPage.html')).pipe(
          res,
        );
      } else if (req.url === '/metavm.mjs') {
        res.writeHead(200, {
          'Content-Type': 'application/javascript; charset=UTF-8',
        });
        fs.createReadStream(path.resolve('./dist/metavm.mjs')).pipe(res);
      } else {
        res.writeHead(404);
        res.end();
      }
    })
    .listen(PORT);

const checkServerStart = (port) =>
  new Promise((resolve, reject) => {
    http.get(`http://localhost:${port}/`, { timeout: 1000 }, (resp) => {
      if (resp.statusCode === 200) {
        resolve();
      } else {
        reject();
      }
    });
  });

module.exports = {
  createServer,
  checkServerStart,
};
