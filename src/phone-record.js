import SIP from 'sip.js';

const users = ['local', 'remote'];
const glob = {};

function getCookie(key) {
  /* eslint-disable-next-line */
  var re = new RegExp('(?:(?:^|.*;\s*) ? '+ key + '\s*\=\s*([^;]*).*$)|^.*$');
  return document.cookie.replace(re, '$1');
}

function randomString(length, chars) {
  let result = '';
  for (let i = length; i > 0; --i) {
    result += chars[Math.round(Math.random() * (chars.length - 1))];
  }
  return result;
}

function initSessEvt(user) {
  const sess = glob[`session_${user}`];
  sess.on('terminated', () => {
    console.log('terminated s1');
  });
  sess.on('accepted', () => {
    console.log('accepted s1');
  });
  sess.on('trackAdded', () => {
    console.log('ss2.....');
    const audio = document.getElementById('test-record-local');
    const pc = sess.sessionDescriptionHandler.peerConnection;
    // Gets remote tracks
    let remoteStream = new MediaStream();
    if (pc.getReceivers) {
      pc.getReceivers().forEach((receiver) => {
        remoteStream.addTrack(receiver.track);
      });
    } else {
      remoteStream = pc.getRemoteStreams()[0];
    }
    audio.srcObject = remoteStream;
    audio.play().catch(() => {
      sess.logger.log('local play was rejected');
    });
  });
}

const initUser = (user) => {
  const domain = 'sipjs.onsip.com';
  const uri = `${user}.${glob.token}@${domain}`;
  const configuration = {
    transportOptions: {
      traceSip: true
    },
    uri,
    displayName: user,
    register: true,
    autostart: true,
    userAgentString: SIP.C.USER_AGENT + ' sipjs.com'
  };
  const ua = new SIP.UA(configuration);

  ua.on('registered', () => {
    console.log('registered', user);
  });
  ua.on('invite', (session) => {
    session.accept();
    glob[`session_${user}`] = session;
    initSessEvt(user);
  });
  return { ua, uri };
};

const init = () => {
  let token = getCookie('onsipToken');
  if (token === '') {
    token = 'supertestrecordphone';
    const d = new Date();
    d.setTime(d.getTime() + (1000 * 60 * 60 * 24));
    document.cookie = `;${document.cookie};onsipToken=${token};expires=${d.toUTCString()};`;
  }
  glob.token = token;
  for (const user of users) {
    const { ua, uri } = initUser(user);
    glob[`${user}_ua`] = ua;
    glob[`${user}_uri`] = uri;
  }

  console.log(glob, 'globs');
};

init();

function updateMedia(sess, session) {
  console.log('ss.....');
  const pc = sess.sessionDescriptionHandler.peerConnection;
  // pc.getSenders().forEach((sender) => {
  //   pc.removeTrack(sender);
  // });
  const localVideo = document.getElementById('localVideo');
  // const remoteVideo = document.getElementById('remoteVideo');
  // localVideo.muted = true;
  // remoteVideo.muted = true;
  [localVideo].forEach((dom) => {
    const stream = dom.captureStream();
    const tracksToAdd = stream.getTracks();
    console.log(tracksToAdd, 'tracksToAdd');
    tracksToAdd.forEach((track) => {
      pc.addTrack(track);
    });
  });
  const pcr = session.sessionDescriptionHandler.peerConnection;
  // Gets remote tracks
  if (pcr.getReceivers) {
    console.log('try add remote audio track');
    pc.getReceivers().forEach((receiver) => {
      pc.addTrack(receiver.track);
    });
  }
}

export default (session) => {
  const sess = glob.local_ua.invite('remote.W74OUq8qphWnITeBczrz5TOYHqEwWDA1@sipjs.onsip.com');
  sess.on('terminated', () => {
    console.log('terminated ss');
  });
  sess.on('accepted', () => {
    console.log('accepted ss');
  });
  sess.on('trackAdded', () => {
    updateMedia(sess, session);
  });
};
