$(document).ready(function() {
  if(typeof(page) != 'undefined' && page == 'login')
    regLoginPageEvents();
  else
    regMainPageEvents();
});

function regLoginPageEvents() {
  var lastUsername = window.localStorage.getItem('LAST_USERNAME');
  if(lastUsername) {
    $('#username').val(lastUsername);
    $('#password').focus();
  }
  else
    $('#username').focus();

  $('#loginform').submit(function(e) {
    e.preventDefault();
    login(
      $('#username').val(),
      $('#password').val(),
      function(ret) {
        window.localStorage.setItem('LAST_USERNAME', $('#username').val());
        location.href = 'index.php'
        /*
        if(navigateTo)
          location.href = navigateTo;
        else
          location.href = 'index.php'
         */
      },
      function(ret) {
        $('#loginform div.alert').fadeIn();
        $('#password').focus();
      }
    );
  });
}

function regMainPageEvents() {
  $('#changePasswordModal').on('hide', function(){$('#alertContainer .alert').remove();});
}

function login(username, password, success, fail) {
  //密码hash和AES密钥一同RSA加密
  var key = CryptoJS.lib.WordArray.random(24).toString(CryptoJS.enc.Base64);
  $.post(
    '?c=app&a=ajax_login',
    {
      username: username,
      key:
        rsaEncrypt(
          JSON.stringify(
            {key: key, passhash: get_pass_hash(password, username)}))
    },
    function(d) {
      var ret = $.parseJSON(d);
      if(ret.errno == 0) {
        window.localStorage.setItem('KEY', key);
        success(ret);
      }
      else
        fail(ret);
    }).fail(fail);
}

function get_pass_hash(password, username) {
    var _passhash = CryptoJS.SHA1(password);
    _passhash = CryptoJS.SHA1(username + _passhash);
    _passhash = CryptoJS.SHA1(password + _passhash);
    return _passhash + '';
}

function logout() {
  window.localStorage.setItem('KEY', '');
  $.get(
    '?c=app&a=ajax_logout',
    function() {
      location.href = '?c=app&a=login';
    }
  );
}

function change_password() {
  $('#changePasswordModal input').val('');
  $('#changePasswordModal').modal('toggle');
}

function post_new_password() {
  var inconsistentAlert = '\
<div id="inconsistentAlert" class="alert alert-error fade in">\
<button type="button" class="close" data-dismiss="alert">&times;</button>\
<strong>错误！</strong>新密码两次输入不一致。\
</div>';
  var oldpasswordAlert = '\
<div id="oldPasswordAlert" class="alert alert-error fade in">\
<button type="button" class="close" data-dismiss="alert">&times;</button>\
<strong>错误！</strong>旧密码输入错误。\
</div>';
  var successAlert = '\
<div id="successAlert" class="alert alert-success fade in">\
<button type="button" class="close" data-dismiss="alert">&times;</button>\
<strong>修改成功！</strong>请重新登录。\
</div>';

  $('#alertContainer .alert').alert('close');
  if($('#newpassword').val().length < 8) {
    $('#newpassword').val('').focus();
    return;
  }
  if($('#newpassword').val() != $('#repeatpassword').val()) {
    $(inconsistentAlert).appendTo('#alertContainer');
    $('#newpassword').focus();
  }
  else {
    encryptedPost(
      '?c=app&a=ajax_change_password',
      {
        oldpasshash:get_pass_hash($('#oldpassword').val(), $('.dropdown span').text()),
        newpasshash:get_pass_hash($('#newpassword').val(), $('.dropdown span').text())
      },
      function(ret) {
        if(ret.errno == 0) {
          $(successAlert).appendTo('#alertContainer');
          setTimeout("$('#changePasswordModal').modal('hide');", 1500);
          $('#changePasswordModal').on('hidden', function() { location.href='?c=app&a=login';});
        }
        else if(ret.errno == -1) {
          $(oldpasswordAlert).appendTo('#alertContainer');
          $('#oldpassword').val('').focus();
        }
      },function(){}
    );
  }
}

function xssf(data) {
  return data.replace(/[&\"<>]/g, function(c) {
    switch(c) {
      case '&':
        return '&amp;';
      case '"':
        return '&quot;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
    }
  });
}

function showErrorModal(msg) {
  $('#modalErrorMsg').text(msg);
  $('#errorModal').modal('show');
}

//获取加密传输用密钥
function getKey() {
  var key = window.localStorage.getItem('KEY');
  if(key != null)
    return key;
  else
    return false;
}

//用RSA公钥加密数据
function rsaEncrypt(data) {
  var modulus = 'D5941D31993E3F792362C405FCDA1E856AA1062B667F88DB70D2ADF9BC6324DABDB3720897A482F2A1482095B05C9E5D592AA205714E3CF85C568FAAF8AC43FE1A56A1CE18976041408FA9C84435F3FF163451E7EB95AF21606D58E6937356F0ABA3D08EC68655732EB850217A02ABB22357D0AFEB922C358F22853CEAACA799';
  var publicE = '10001';
  var rsaObj = new RSAKey();
  rsaObj.setPublic(modulus, publicE);
  var hexData = rsaObj.encrypt(data);
  return CryptoJS.enc.Hex.parse(hexData).toString(CryptoJS.enc.Base64);
}

//加密数据
function encryptedData(data) {
  var ivStr = CryptoJS.enc.Base64.stringify(CryptoJS.lib.WordArray.random(12));
  var key = CryptoJS.enc.Latin1.parse(getKey());
  var encryptedData = CryptoJS.AES.encrypt(
    data, key,
    {
      padding: CryptoJS.pad.ZeroPadding,
      iv: CryptoJS.enc.Latin1.parse(ivStr),
      mode: CryptoJS.mode.CBC
    }
  );
  return ivStr + encryptedData.toString();
}

//解密服务器中返回的加密数据并解析成对象
function parseEncryptedData(data) {
  //返回数据的前16个字符为IV
  var ivStr = data.substr(0, 16);
  var dataStr = data.substr(16);
  var iv = CryptoJS.enc.Latin1.parse(ivStr);
  var key = CryptoJS.enc.Latin1.parse(getKey());
  var originalData = CryptoJS.AES.decrypt(
    dataStr, key,
    {
      padding: CryptoJS.pad.ZeroPadding,
      iv: iv,
      mode: CryptoJS.mode.CBC
    }
  );
  return $.parseJSON(originalData.toString(CryptoJS.enc.Utf8));
}

//加密POST数据
function encryptedPost(url, data, success, fail) {
  var dataToPostStr = JSON.stringify(data);
  $.post(
    url,
    {
      data: encryptedData(dataToPostStr)
    },
    function(responseData){success(parseEncryptedData(responseData));}
  ).fail(fail);
}
