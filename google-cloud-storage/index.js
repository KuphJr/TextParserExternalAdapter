const {Storage} = require('@google-cloud/storage');
const fs = require('fs');

const storage = new Storage({keyFilename: 'key.json'});

const saveAPIkey = async (input, callback) => {
  console.log("INPUT", JSON.stringify(input));
  let message = "";

  const bucketName = 'cached_headers';
  const fileName = 'cachedHeaders.json';
  const destFileName = '/cachedHeaders.json';

  async function downloadFile() {
    console.log("#1 Download");
    const options = {
      destination: destFileName,
    };
  
    // Downloads the file
    await storage.bucket(bucketName).file(fileName).download(options);
  
    console.log(
      `gs://${bucketName}/${fileName} downloaded to ${destFileName}.`
    );
  }

  function addHeaderToJSON() {
    console.log("#2 Append");
    let cachedHeaders = JSON.parse(fs.readFileSync(destFileName).toString());
    let newCachedHeader = {
      authKey: input.authKey,
      authContractAddr: input.authContractAddr,
      headers: input.headers };
    let overwrotePrevEntry = false;
    // check if the entry already exists & if it does, overwrite it
    let i = 0;
    for (const header of cachedHeaders) {
      if (header.authContractAddr === input.authContractAddr && header.authKey === input.authKey) {
        cachedHeaders[i] = newCachedHeader;
        i++;
        console.log("overwrote previous entry");
        message = `The headers have been updated for contract address: ${input.authContractAddr} with the reference r: ${input.authKey}`;
        overwrotePrevEntry = true;
        break;
      }
    }
    if (!overwrotePrevEntry) {
      console.log("new entry");
      message = `The headers have been saved to the external adapter and can be used by contract address: ${input.authContractAddr} with the reference r: ${input.authKey}`;
      cachedHeaders.push(newCachedHeader);
    }
    return JSON.stringify(cachedHeaders);
  }

  async function saveJSONtoFile(jsonString) {
    fs.writeFileSync(destFileName, jsonString, (err) => {
      if (err) {
          console.log(err);
          process.exit(1);
      }
    });
  }

  async function uploadFile() {
    await storage.bucket(bucketName).upload(destFileName, {
        destination: fileName,
    });

    console.log(`${fileName} uploaded to ${bucketName}`);
  }
  
  try {
    await downloadFile();
    let jsonString = addHeaderToJSON();
    await saveJSONtoFile(jsonString);
    await uploadFile();
    callback(200, { message: message });
  } catch (err) {
    console.log(err);
    callback(500, { message: err.message })
  } finally {
    try {
      fs.unlinkSync(destFileName);
    } catch (delError) {
      console.log(`Tried to delete ${destFileName} but it didn't exist`);
    }
  }
};

// Export for testing with express
module.exports.saveAPIkey = saveAPIkey;