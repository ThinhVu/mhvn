import apn from 'apn'

// const apnOptions = {
//    token: {
//       key: "-----BEGIN PRIVATE KEY-----\n" +
//         "MIG...\n" +
//         "ynN...\n" +
//         "dRm...\n" +
//         "T52...\n" +
//         "-----END PRIVATE KEY-----",
//       keyId: "J2P3...",
//       teamId: "67Y..."
//    },
//    production: true
// }

const apnOptions = {
  token: {
    key: "",
    keyId: "",
    teamId: ""
  },
  production: true
}

const apnProvider = apnOptions.token?.key ? new apn.Provider(apnOptions) : null

export default apnProvider

