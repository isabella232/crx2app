// See Purple/license.txt for Google BSD license
// Copyright 2011 Google, Inc. johnjbarton@johnjbarton.com

/*global chrome console */


// @return: connection object with attach/detach addListener/postMessage

function getChromeExtensionPipe(){

  var appEnd = {

    // Announce to the extn that we are running and
    // ask the extn to give us a port name unique to this connection
    attach: function(callback) {
      if (!chrome || !chrome.extension) {
        throw new Error("Must be loaded into an iframe using a chrome extension url");
      }
      var request = {
        name:    getChromeExtensionPipe.NAME, 
        version: getChromeExtensionPipe.VERSION
      };
      chrome.extension.sendRequest(request, this.onAttach.bind(this, callback));
    },

    detach: function() {
      this.port.disconnect();
    },
    // Get the assigned name of the port and connect to it
    //
    onAttach: function(callback, response) {
      if (!response.name) {
        console.error("crx2App the extension must send .name in response", response);
      }
    
      this.name = response.name;
      
      // open a long-lived connection using the assigned name
      this.port = chrome.extension.connect({name: this.name});
    
      // prepare for disconnection
      this.port.onDisconnect.addListener(this.onDisconnect);
    
      // prepare for extension messages to from extn to app
      this.port.onMessage.addListener(this.fromExtnToApp);
      
      // signal the app that we are ready
      callback();
    },
    
    // Our port closed
    onDisconnect: function() {
      this.fromExtnToApp({source:'crx2app', method: 'onDisconnect', params:[]});
      delete this.listener;
    },

    addListener: function(listener) {
      this.listener = listener; // may be null
    },
    
    fromExtnToApp: function(msgObj) {
      if (this.listener) {
        this.listener(msgObj);
      } // else no listener
    },

    fromAppToExtn: function(msgObj) {
      this.port.postMessage(msgObj);
    },
    
    _bindListeners: function() {
      this.onDisconnect = this.onDisconnect.bind(this);
      this.fromExtnToApp = this.fromExtnToApp.bind(this);
      
      this.attach = this.attach.bind(this);
      this.detach = this.detach.bind(this);
      this.fromAppToExtn = this.fromAppToExtn.bind(this);
      this.addListener = this.addListener.bind(this);
    }
  };
  
  appEnd._bindListeners();
  
  return {  // these functions are bound to appEnd, not the return object
    attach: appEnd.attach,
    postMessage: appEnd.fromAppToExtn,
    addListener: appEnd.addListener,
    detach: appEnd.detach,
    NAME: getChromeExtensionPipe.NAME,
    VERSION: getChromeExtensionPipe.VERSION
  };
}

getChromeExtensionPipe.NAME = 'crx2app';
getChromeExtensionPipe.VERSION = '1';
