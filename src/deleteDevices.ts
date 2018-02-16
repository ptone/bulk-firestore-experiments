//const google = require('googleapis');
// const google = require("googleapis-async");
var {google} = require('googleapis');
const Rx = require('rxjs/Rx');


const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';

const concurrentRequests:number = 1;
const batchSize:number = 30;

import { makeClient } from './createDevices';

const cloudRegion: string = "us-central1";
const registryId: string = "other-registry";
const projectId: string = "iot-provisioning";
const parentName = `projects/${projectId}/locations/${cloudRegion}`;
const registryName = `${parentName}/registries/${registryId}`;
async function getADC() {
  const res = await google.auth.getApplicationDefault();
  let client = res.credential;
  if (client.createScopedRequired && client.createScopedRequired()) {
    // Scopes can be specified either as an array or as a single, space-delimited string.
    const scopes = ['https://www.googleapis.com/auth/cloud-platform'];
    client = client.createScoped(scopes);
  }
  return {
    client: client,
    projectId: res.projectId
  }
}

function deleteDevice(client:any, deviceInfo:any) {
  // let deviceName = {'name':`${registryName}/${deviceInfo.numId}`};
  console.log('deleting', deviceInfo);
  return Rx.Observable.bindNodeCallback(
    client.projects.locations.registries.devices.delete)({name:`${registryName}/devices/${deviceInfo.numId}`}); 
}

function listDevices(client:any, pageToken?:string) {


  const parentName = `projects/${projectId}/locations/${cloudRegion}`;
  const registryName = `${parentName}/registries/${registryId}`;

  const request: any = {
    parent: registryName,
    //resource: body
    pageSize: batchSize,
  };
  if (pageToken) {
    request['pageToken'] = pageToken;
  }
  // client.projects.locations.registries.devices.list(request, function(r, err){
  //   console.log('result');
  //   console.log(r);
  //   console.log('result');
  //   console.log(err);
  // });
  return Rx.Observable.bindNodeCallback(
    client.projects.locations.registries.devices.list)(request);
}


async function main() {
  // let client = await makeClient();
  const adc = await getADC();
  let client = google.cloudiot({
    version: 'v1',
    auth: adc.client
  })
  // console.log(client);
  // console.log('there');
  
  let cursor:string;
  
  let items$ = Rx.Observable.of('')
    .expand(val => {
      return listDevices(client, cursor)
      .map(r => {
        //console.log('foo');
        //console.log(r[0].nextPageToken);
        //console.log(r.data);
        cursor = r.data.nextPageToken;
        return r.data;
        // console.log('------------------');
        // cursor = r[0].nextPageToken;
        // return r[0]
      })
      .flatMap(d => Rx.Observable.from(d.devices))
      }).skip(1);//.take(3000);

  //let items$ = listDevices(client);
  // items$.subscribe(v => console.log(v[0].devices));
  items$
  .mergeMap(deviceInfo => deleteDevice(client, deviceInfo),
    () => '',
    concurrentRequests)
  // .catch(e => {
  //   console.error(e);
  //   return Rx.Observable.of('error');
  //   }
  // 
  .subscribe(v => console.log("done"), e => console.log(e));
}

main();
