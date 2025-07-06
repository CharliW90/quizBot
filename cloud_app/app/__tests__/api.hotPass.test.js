const { newPassword, checkForPassword, count, hardReset } = require('../utility/hotPass');

describe("newPasskey", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  })

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  })

  test("generates a new passkey in the correct format", () => {
    const passkey = newPassword();

    expect(passkey).toMatch(/^[0-9a-fA-F-]+-[0-9a-fA-F]{32}$/);
  })

  test("new passkey is immediately valid", () => {
    const passkey = newPassword();

    expect(checkForPassword(passkey)).toBe(true);
  })

  test("expect passkeys to be immediately invalidated by being checked", () => {
    const passkey = newPassword();

    expect(checkForPassword(passkey)).toBe(true);
    expect(checkForPassword(passkey)).toBe(false);
  })

  test("expect a given passkey to last for 60 seconds", () => {
    const passkey = newPassword();

    jest.advanceTimersByTime(59999);

    expect(checkForPassword(passkey)).toBe(true);
  })

  test("expect a given passkey to become invalid after 60 seconds", () => {
    const passkey = newPassword();

    jest.advanceTimersByTime(60001);

    expect(checkForPassword(passkey)).toBe(false);
  })

  test("expect a given passkey to become invalid after hardReset", () => {
    const passkey = newPassword();

    hardReset();

    expect(checkForPassword(passkey)).toBe(false);
  })

  test("expect hardReset to wipe passkeys", () => {
    newPassword();
    newPassword();
    newPassword();

    expect(count()).toBe(3)
    hardReset()
    expect(count()).toBe(0)
  })

  test("expect passkeys to become invalid at 60 seconds", () => {
    newPassword();

    jest.advanceTimersByTime(59999);

    expect(count()).toBe(1);

    jest.advanceTimersByTime(1)

    expect(count()).toBe(0)
  })

  test("passing non-string values to checkForPass() does not work", () => {
    expect(checkForPassword(true)).toBe(false);
    expect(checkForPassword(() => {return true})).toBe(false);
    expect(checkForPassword(eval(() => {return true}))).toBe(false);
    expect(checkForPassword(/^[0-9a-fA-F-]+-[0-9a-fA-F]{32}$/)).toBe(false)
    expect(checkForPassword(this)).toBe(false)
    expect(checkForPassword(eval(this))).toBe(false)
  })
  
  test("invalid password checks have no impact on stored passkeys", () => {
    const firstPass  = newPassword();
    const secondPass = newPassword();
    const thirdPass  = newPassword();

    expect(count()).toBe(3)
    checkForPassword("firstPass")
    checkForPassword("firstPass")
    checkForPassword("firstPass")
    expect(count()).toBe(3)
    checkForPassword("firstPass")
    checkForPassword("firstPass")
    checkForPassword(firstPass)
    expect(count()).toBe(2)
    checkForPassword("firstPass")
    checkForPassword(firstPass)
    checkForPassword(secondPass)
    expect(count()).toBe(1)
    newPassword()
    expect(count()).toBe(2)
    checkForPassword(firstPass)
    checkForPassword(secondPass)
    checkForPassword(thirdPass)
    expect(count()).toBe(1)

    hardReset()
  })
})