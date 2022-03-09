/**
 * preview-panel.js (source of /jslib/preview-panel.min.js)
 *
 * How to compile this:
 *   $ cd /data/monaca.local/
 *   $ bin/build_preview_panel.sh
 */

// parent window
window.ParentIDE = (window.opener != null) ? window.opener : window.parent;

// consts
window.Consts = {
  iframeUrlPrefix: window.previewUrl,
  frameSize: 55,
  deviceList: {
    iphone8:     { platform: 'iOS',     name: 'iPhone 8',       width: 750,  height: 1334, viewportWidth: 375 },
    iphone8plus: { platform: 'iOS',     name: 'iPhone 8 Plus',  width: 1242, height: 2208, viewportWidth: 414 },
    iphonex:     { platform: 'iOS',     name: 'iPhone X',       width: 1125, height: 2436, viewportWidth: 375 },
    ipadpro10:   { platform: 'iOS',     name: 'iPad Pro 10.5in', width: 1668, height: 2224, viewportWidth: 834 },
    ipadpro12:   { platform: 'iOS',     name: 'iPad Pro 12.9in', width: 2048, height: 2732, viewportWidth: 1024 },
    pixel2:      { platform: 'Android', name: 'Pixel 2',        width: 1080, height: 1920, viewportWidth: 360 },
    pixel2xl:    { platform: 'Android', name: 'Pixel 2 XL',     width: 1440, height: 2880, viewportWidth: 480 },
    galaxys8:    { platform: 'Android', name: 'Galaxy S8',      width: 1440, height: 2960, viewportWidth: 480 },
    xperiaxz1:   { platform: 'Android', name: 'Xperia XZ1',     width: 1080, height: 1920, viewportWidth: 360 },
  },
  checkIcon: 'ui-icon-check',
  isEditor: (ParentIDE.config && ParentIDE.config.isEditor) || false,
  projectId: window.projectId,
  staticPreviewUrl: 'https://preview-5ee-5eeaddd5e788854300e9b0f2-5f98e667e788857f00ad3f81.lmonaca.com/www/index.html'
};

// i18n
window.i18n = {
  textMap: {
    ja: {
      USE_DEBUGGER: '正確に表示するには、<a href="https://ja.docs.monaca.io/products_guide/debugger/installation/" target="_blank">Monaca Debugger</a> を利用してください。',
      VERTICAL: '縦向き',
      HORIZONTAL: '横向き',
    },
    en: {
      USE_DEBUGGER: 'To see the actual design, use <a href="https://en.docs.monaca.io/products_guide/debugger/installation/" target="_blank">Monaca Debugger</a>.',
      VERTICAL: 'Vertical',
      HORIZONTAL: 'Horizontal',
    }
  },
  text: function(textId) {
    return i18n.textMap[LANG == 'ja' ? 'ja' : 'en'][textId];
  },
  applyText: function() {
    $('.i18n-text').each(function(index, element) {
      $element = $(element);
      var textId = $element.data('i18n');
      $element.html(i18n.text(textId));
    });
  }
};

// virtual device
window.Device = {
  isVertical: true,
  aspect: 'iphone8',
  showMsgDebugger: true,
  SETTING_ATTR_LIST: ['isVertical', 'aspect', 'showMsgDebugger'],
  setDefaultAspect: function() {
    if (Consts.deviceList[this.aspect] === undefined) {
      this.aspect = 'iphone8';
    }
  },
  getAspect: function() {
    return this.aspect;
  },
  setAspect: function(aspect) {
    this.aspect = aspect;
    this.saveSettings();
    this.onAspectChange();
  },
  onAspectChange: function() {
    if(window.subscribeData) {
      window.subscribeData.PubSub.publish(window.subscribeData.Constant.EVENT.PREVIEWER_VIEW_DEVICE_CHANGED, {
        id: this.aspect,
        device: window.Consts.deviceList[this.aspect],
        componentId: window.previewerId
      });
    }
  },
  getIsVertical: function() {
    return this.isVertical;
  },
  setIsVertical: function(isVertical) {
    this.isVertical = isVertical;
    this.saveSettings();
  },
  getRawWidth: function() {
    this.setDefaultAspect();
    return Consts.deviceList[this.aspect].width;
  },
  getRawHeight: function() {
    this.setDefaultAspect();
    return Consts.deviceList[this.aspect].height;
  },
  getRawViewportWidth: function() {
    this.setDefaultAspect();
    return Consts.deviceList[this.aspect].viewportWidth;
  },
  getRawViewportHeight: function() {
    this.setDefaultAspect();
    return Math.round(this.getRawHeight() * (this.getRawViewportWidth() / this.getRawWidth()));
  },
  getViewportWidth: function(){
    return this.isVertical ? this.getRawViewportWidth() : this.getRawViewportHeight();
  },
  getViewportHeight: function(){
    return this.isVertical ? this.getRawViewportHeight() : this.getRawViewportWidth();
  },
  getWidth: function(){
    return this.isVertical ? this.getRawWidth() : this.getRawHeight();
  },
  getHeight: function(){
    return this.isVertical ? this.getRawHeight() : this.getRawWidth();
  },
  reload: function() {
    if (window.isTerminalFeatureEnabled() || FileCombo.getUrl() !== Consts.staticPreviewUrl) {
      $.ajax({
        url: FileCombo.getUrl(),
        xhrFields: {
          withCredentials: true
        },
        success: function () {
          $E.iframe.attr('src', FileCombo.getUrl());
        },
        error: function () {
          $E.iframe.attr('src', Consts.staticPreviewUrl);
          window.subscribeData.PubSub.publish(window.subscribeData.Constant.EVENT.PREVIEWER_VIEW_URL_FAILED);
        }
      });
    } else {
      $E.iframe.attr('src', Consts.staticPreviewUrl);
    }
  },
  getStorageKey: function() {
    return `${Consts.projectId}_${window.previewerId}_previewer`;
  },
  saveSettings: function() {
    var self = this;
    var data = {};
    self.SETTING_ATTR_LIST.forEach(function(attr) {
      data[attr] = self[attr];
    });
    localStorage.setItem(self.getStorageKey(), JSON.stringify(data));
  },
  getSettingParamsStr: function() {
    var self = this;
    var data = localStorage.getItem(self.getStorageKey());
    var str = '';
    if (data != null) {
      data = JSON.parse(data);
      str = '?' + self.getOrientationParamStr(data.isVertical) + self.getModelParamsStr(data.aspect);
    }
    return str;
  },
  getOrientationParamStr: function(isVertical) {
    if (isVertical == true) {
      return 'orientation=portrait';
    } else {
      return 'orientation=landscape';
    }
  },
  getModelParamsStr: function(model) {
    var self = this;
    var ret = '';
    for (var key in Consts.deviceList[model]) {
      ret += '&' + key + '=' + encodeURIComponent(Consts.deviceList[model][key]);
    }
    return ret;
  },
  restoreSettings: function() {
    var self = this;
    var data = localStorage.getItem(self.getStorageKey());
    if (data != null) {
      data = JSON.parse(data);
      self.SETTING_ATTR_LIST.forEach(function(attr) {
        if (data[attr] !== undefined) {
          self[attr] = data[attr];
        }
      });
    }
    if (self.showMsgDebugger) {
      $E.extraInfo.show();
    } else {
      $E.extraInfo.hide();
    }

    this.onAspectChange();
  }
};

// layout manager
window.Layout = {
  onResize: function(){
    // iframe
    var meshWidth = $E.window.innerWidth();
    var meshHeight = $E.window.innerHeight() - $E.nav.innerHeight() - 4;  // 4 prevents y-scrollbar

    var finalWidth  = Math.max(150, meshWidth);
    var finalHeight = Math.max(150, meshHeight);
    var viewportWidth = Device.getViewportWidth();
    var viewportHeight = Device.getViewportHeight();
    var scale = Math.min(finalWidth / viewportWidth, finalHeight / viewportHeight);

    finalWidth = Math.round(viewportWidth * scale);
    finalHeight = Math.round(viewportHeight * scale);

    $E.iframe.width(viewportWidth);
    $E.iframe.height(viewportHeight);
    $E.iframe.css('transform', 'scale(' + scale  + ')');

    $E.previewBox.width(finalWidth);
    $E.previewBox.height(finalHeight);

    // footer
    window.setTimeout(function(){
      $E.extraInfo.width($E.window.innerWidth() - 8 * 2);  // 8 means padding
    }, 100);
  }
};

// combobox
window.FileCombo = {
  items: {},
  updateOptions: function (){
      Device.reload();
  },

  getUrl: function() {
    return Consts.iframeUrlPrefix + Device.getSettingParamsStr();
  },

  updateUrl: function(url) {
    if (url && url !== Consts.iframeUrlPrefix) Consts.iframeUrlPrefix = url;
  }
};

window.Menu = {
  init: function() {
    this._initDeviceDropdown();
    this._initButtons();
  },

  _initDeviceDropdown: function() {
    const $select = $('#device-dropdown');
    const deviceKeys = Object.keys(window.Consts.deviceList);
    let groupedDevices = {};

    deviceKeys.forEach(key => {
      const device = window.Consts.deviceList[key];
    })

    deviceKeys.forEach(key => {
      const device = window.Consts.deviceList[key];
      const deviceDisplayName = `${device.name} (${device.width}x${device.height})`;
      const isSelected = window.Device.getAspect() === key;
      const optHtml = `<option value="${key}" ${isSelected ? 'selected' : ''}>${deviceDisplayName}</option>`;
      if(!groupedDevices[device.platform]) groupedDevices[device.platform] = [];
      groupedDevices[device.platform].push(optHtml);
    });

    const groupKeys = Object.keys(groupedDevices);
    groupKeys.forEach(key => {
      const devices = groupedDevices[key];
      $select.append(`<optgroup label="${key}">${devices.join('')}</optgroup>`);
    });

    $select.on('change', (ev) => {
      window.Device.setAspect(ev.currentTarget.value);
      window.Device.reload();
      window.Layout.onResize();
    });
  },

  _initButtons: function() {
    $portraitButton = $('#orientation-button-portait');
    $landscapeButton = $('#orientation-button-landscape');

    if(window.Device.isVertical) {
      $portraitButton.addClass('disabled');
    } else {
      $landscapeButton.addClass('disabled');
    }

    $portraitButton.on('click', () => {
      window.Device.setIsVertical(true);
      window.Device.reload();
      window.Layout.onResize();

      $portraitButton.addClass('disabled');
      $landscapeButton.removeClass('disabled');

      return false;
    });

    $landscapeButton.on('click', () => {
      window.Device.setIsVertical(false);
      window.Device.reload();
      window.Layout.onResize();

      $landscapeButton.addClass('disabled');
      $portraitButton.removeClass('disabled');

      return false;
    });

    $('#reload-button').on('click', () => {
      window.Device.reload();
      return false;
    });

    $('#attach-button').on('click', () => {
      window.close();
      return false;
    });

    $('#detach-button').on('click', () => {
      window.parentPreviewer.onDetachBtn();
      return false;
    });
  }
}

window.isTerminalFeatureEnabled = function () {
  if (!ParentIDE.config.client.service.terminal) return false;
  try {
    // default, fallback -> true
    if (!ParentIDE.parent.location.search) return true;
    const urlParams = new URLSearchParams(ParentIDE.location.search);
    const previewer = urlParams.get('terminal');
    // if ?terminal=0 or ?terminal=false is appended to the url
    if (previewer && (previewer === '0' || previewer === 'false')) return false;
    return true;
  } catch (err) {
    return true;
  }
}

/////////////////// on ready
$(function(){
  const componentIdPrefix = 'mn-gl-';

  window.componentId = location.search.match(/id=(\d*)/)[1];
  window.previewerId = componentIdPrefix + componentId;
  window.parentPreviewer = ParentIDE.angular.element(ParentIDE.document.querySelector(`#${previewerId} .previewer-view`)).isolateScope();
  window.subscribeData = ParentIDE.angular.element(ParentIDE.document.querySelector('.ide-wrapper')).scope().fetchForSubscribe();

  window.onbeforeunload = function (event) {
    window.subscribeData.PubSub.publish(window.subscribeData.Constant.EVENT.TOGGLE_PREVIEWER_VIEW, {
      open: true,
      componentState: { id: componentId }
    });
  };

  //// common elements
  window.$E = {
    window: $(window),
    nav: $('nav'),
    previewWrap: $('#PreviewWrap'),
    previewBox: $('#PreviewBox'),
    extraInfo: $('#ExtraInfo'),
    iframe: $('#PreviewBox iframe'),
  };

  //// init
  i18n.applyText();
  Device.restoreSettings();
  Layout.onResize();
  Menu.init();
  FileCombo.updateOptions();

  //// register events
  $E.window.resize(function(){
    Layout.onResize();
  });

  $E.extraInfo.find('.close-btn').click(function(){
    $E.extraInfo.fadeOut(200);
    Device.showMsgDebugger = false;
    Device.saveSettings();
    return false;
  });

  if (!window.Consts.isEditor) {
    $('#attach-button').hide();
    $('#detach-button').hide();
  }

  // register parent events
  var global = window;

  if(window.Consts.isEditor) {
    window.subscribeData.PubSub.subscribe(window.subscribeData.Constant.EVENT.PREVIEWER_VIEW_URL_CHANGED, function(data) {
      global.FileCombo.updateUrl(data.url);
    });
  }
  if (!window.isTerminalFeatureEnabled()) {
    window.subscribeData.PubSub.subscribe(window.subscribeData.Constant.EVENT.PREVIEWER_VIEW_URL_REFRESH, function(data) {
      global.FileCombo.updateOptions();
    });
  }
});
