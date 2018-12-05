import { expect } from 'chai';
import 'mocha';

import { flatObject } from '../src/helpers/object-flatten';
import { arrayToObject } from '../src/helpers/object';

const nestedConf = [
  new Set(['', 'td']),
  new Set(['td'])
];
// const nestedConf = new Set(['', 'data'])
const colsConf: Array<{ [k: string]: string }> = []
colsConf.push({
  "id": "UInt64",
  "uid": "UInt64",
  "date": "Date",
  "dateTime": "DateTime",
  "timestamp": "UInt64",
  "channel": "Enum8('' = 0, 'other' = 1, 'track' = 5, 'wh' = 6, 'pixel' = 7, 'redir' = 8, 'ws' = 9, 'r1' = 33, 'r2' = 34, 'r3' = 35)",
  "projectId": "UInt32",
  "test_myval": "String",
  "name": "String",
  "td_ip": "String",
  "service": "String",
  "td.key": "Array(String)",
  "td.value": "Array(String)",
  "data_gaId": "String",
  "extra.key": "Array(String)",
  "extra.value": "Array(String)"
})

colsConf.push({
  "id": "UInt64",
  "uid": "UInt64",
  "date": "Date",
  "dateTime": "DateTime",
  "timestamp": "UInt64",
  "channel": "Enum8('' = 0, 'other' = 1, 'track' = 5, 'wh' = 6, 'pixel' = 7, 'redir' = 8, 'ws' = 9, 'r1' = 33, 'r2' = 34, 'r3' = 35)",
  "projectId": "UInt32",
  "test_myval": "String",
  "name": "String",
  "td_ip": "String",
  "service": "String",
  "td.key": "Array(String)",
  "td.value": "Array(String)",
  "data_gaId": "String"
})

const event1 = {
  channel: 'wh',
  uid: '6385514503571767296',
  name: 'halo',
  service: 'test',
  date: '2018-07-02',
  dateTime: '2018-07-02 21:41:21',
  timestamp: 1530567681141,
  extrahz: 'hello',
  td: {
    ip: 'xxx',
    fp: '234242323'
  },
  test: {
    myval: '123',
    extra_arr: [{ hmmm: 'dada' }, 4, 6]
  },
  huyolumn: 'asda',
  fixed: 'asda',
  huiksed: 21312
}

const expected = [
  {
    channel: 'wh',
    uid: '6385514503571767296',
    name: 'halo',
    service: 'test',
    date: '2018-07-02',
    dateTime: '2018-07-02 21:41:21',
    timestamp: 1530567681141,
    td_ip: 'xxx',
    'td_extra.key': ['fp'],
    'td_extra.value': ['234242323'],
    'test_myval': '123',
    'extra.key': ['extrahz', 'test_extra_arr', 'huyolumn', 'fixed', 'huiksed'],
    'extra.value': ['hello', "{\"hmmm\":\"dada\"},4,6", 'asda', 'asda', '21312']
  },
  {
    channel: 'wh',
    uid: '6385514503571767296',
    name: 'halo',
    service: 'test',
    date: '2018-07-02',
    dateTime: '2018-07-02 21:41:21',
    timestamp: 1530567681141,
    td_ip: 'xxx',
    'td_extra.key': ['fp'],
    'td_extra.value': ['234242323'],
    'test_myval': '123'
  }
];

const extra = [
  [],
  [['extrahz', 'hello'],
  ['test_extra_arr', ['{"hmmm":"dada"}',4,6]],
  ['huyolumn', 'asda'],
  ['fixed', 'asda'],
  ['huiksed', 21312]]
]

describe('Flatten test', () => {

  it('transform equal', () => {
    const extra_: Array<[string, any]> = []
    const result = arrayToObject(flatObject(event1, nestedConf[0], colsConf[0], [], '_', extra_));
    expect(result).to.deep.equal(expected[0]);
    expect(extra_).to.deep.equal(extra[0]);
  });
  it('transform equal', () => {
    const extra_: Array<[string, any]> = []
    const result = arrayToObject(flatObject(event1, nestedConf[1], colsConf[1], [], '_', extra_));
    expect(result).to.deep.equal(expected[1]);
    expect(extra_).to.deep.equal(extra[1]);
  });
});
