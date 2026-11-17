type LegacyMediaDevices = Navigator & {
  getUserMedia?: (
    constraints: MediaStreamConstraints,
    success: (stream: MediaStream) => void,
    failure: (error: Error) => void,
  ) => void
  webkitGetUserMedia?: LegacyMediaDevices['getUserMedia']
  mozGetUserMedia?: LegacyMediaDevices['getUserMedia']
}

export function hasMicrophoneSupport() {
  const legacyNavigator = navigator as LegacyMediaDevices
  return Boolean(
    navigator.mediaDevices?.getUserMedia ||
    legacyNavigator.getUserMedia ||
    legacyNavigator.webkitGetUserMedia ||
    legacyNavigator.mozGetUserMedia,
  )
}

export function requestMicrophone(constraints: MediaStreamConstraints): Promise<MediaStream> {
  const modernGetUserMedia = navigator.mediaDevices?.getUserMedia
  if (modernGetUserMedia) return modernGetUserMedia.call(navigator.mediaDevices, constraints)

  const legacyNavigator = navigator as LegacyMediaDevices
  const legacyGetUserMedia = legacyNavigator.getUserMedia
    || legacyNavigator.webkitGetUserMedia
    || legacyNavigator.mozGetUserMedia
  if (legacyGetUserMedia) {
    return new Promise((resolve, reject) => {
      legacyGetUserMedia.call(navigator, constraints, resolve, reject)
    })
  }

  return Promise.reject(new Error(microphoneUnavailableMessage()))
}

export function microphoneUnavailableMessage() {
  const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1'
  if (location.protocol !== 'https:' && !isLocalhost) {
    return 'Microphone access requires a secure HTTPS page. Open Sur at https://pankhurimishra.github.io/MusicApp/ in Safari.'
  }
  return 'This browser does not provide microphone access. Open Sur directly in Safari and check that iPadOS allows microphone access.'
}
