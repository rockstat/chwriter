import { expect } from 'chai';
import 'mocha';

import { flatObject } from '../src/helpers/object-flatten';

const nestedConf = new Set(['', 'td', 'data'])
// const nestedConf = new Set(['', 'data'])
const colsConf = {
  "id": "UInt64",
  "uid": "UInt64",
  "date": "Date",
  "dateTime": "DateTime",
  "timestamp": "UInt64",
  "channel": "Enum8('' = 0, 'other' = 1, 'track' = 5, 'wh' = 6, 'pixel' = 7, 'redir' = 8, 'ws' = 9, 'r1' = 33, 'r2' = 34, 'r3' = 35)",
  "projectId": "UInt32",
  "name": "String",
  "td_ip": "String",
  "service": "String",
  "td.key": "Array(String)",
  "td.value": "Array(String)",
  "data.key": "Array(String)",
  "data.value": "Array(String)",
  "data_gaId": "String",
  "extra.key": "Array(String)",
  "extra.value": "Array(String)"
}


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
    ip: 'xxx'
  },
  data: {
    huyolumn: 'asda',
    fixed: 'asda',
    huiksed: 21312
  }
}

const expected = {
  channel: 'wh',
  uid: '6385514503571767296',
  name: 'halo',
  service: 'test',
  date: '2018-07-02',
  dateTime: '2018-07-02 21:41:21',
  timestamp: 1530567681141,
  td_ip: 'xxx',
  'td_extra.key': [],
  'td_extra.value': [],
  'data_extra.key': ['huyolumn', 'fixed', 'huiksed'],
  'data_extra.value': ['asda', 'asda', '21312'],
  'extra.key': ['extrahz'],
  'extra.value': ['hello']
};

describe('Flatten test', () => {

  it('correct transform', () => {
    const result = flatObject(event1, nestedConf, colsConf);
    expect(result).to.deep.equal(expected);
  });

});
