
// import * as http from 'http';
// import * as Promise from 'bluebird';
// import * as qs from 'qs';
// import * as urlLib from 'url';
// import { QueryParams } from '@app/types';
// import { METHOD_POST, CONTENT_TYPE_JSON, HContentType, METHOD_GET } from '@app/constants';

// function get(url: string, query: QueryParams): Promise<object> {
//   return new Promise((resolve, reject) => {
//     http.get(url, function (response) {
//       let body = '';
//       response.on('data', function (d) {
//         body += d;
//       });
//       response.on('end', function () {
//         try {
//           const parsed = JSON.parse(body);
//           resolve(parsed);
//         } catch (error) {
//           reject(error);
//         }
//       });
//     });
//   })
// }

// function query(method: string = METHOD_GET, url: string, query: QueryParams): Promise<object> {
//   return new Promise((resolve, reject) => {
//     const {hostname, port, path} = urlLib.parse(url);
//     const options = {
//       hostname,
//       port,
//       path,
//       method,
//       headers: {
//         [HContentType]: CONTENT_TYPE_JSON,
//         'Content-Length': Buffer.byteLength(post_data)
//       }
//     }
//     http.request(url, function (response) {
//       let body = '';
//       response.on('data', function (d) {
//         body += d;
//       });
//       response.on('end', function () {
//         try {
//           const parsed = JSON.parse(body);
//           resolve(parsed);
//         } catch (error) {
//           reject(error);
//         }
//       });
//     });
//   })
// }
