const md5 = require('js-md5');

const livePasswords = [];

// Creates a class that holds a temporary password, which self-destructs after a period of 60 seconds
class SecurityKey {
  #passkey
  #cleanupTimer
  constructor(key) {
    this.id = crypto.randomUUID()
    this.#passkey = `${this.id}-${md5(key)}`
    this.#cleanupTimer = setTimeout(() => this.destruct(), 60000);
  }
  
  destruct() {
    clearTimeout(this.#cleanupTimer)
    const thisIndex = livePasswords.indexOf(this);
    if(thisIndex >= 0){
      livePasswords.splice(thisIndex, 1)
    }
  }
  
  checkPass(password) {
    if(password === this.#passkey){
      this.destruct();
      return true;
    } else {
      return false;
    }
  }
}

exports.checkForPassword = (password) => {
  let bool = false;
  livePasswords.forEach((entry) => {
    const result = entry.checkPass(password)
    if(result){
      bool = true;
    }
  })
  return bool;
}

exports.newPassword = () => {
  const key = Date.now().toString();
  const newSecurityKey = new SecurityKey(key);
  livePasswords.push(newSecurityKey);
  return `${newSecurityKey.id}-${md5(key)}`;
}