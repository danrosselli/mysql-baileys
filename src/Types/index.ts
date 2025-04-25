import { Connection } from 'mysql2/promise'

type Awaitable<T> = T | Promise<T>

type Contact = {
	/** Unique identifier for the contact */
	id: string
	/** Legacy ID if available */
	lid?: string
	/** Display name of the contact */
	name?: string
	/** Notification settings (e.g., ringtone) */
	notify?: string
	/** Verified name, if the contact verified their identity */
	verifiedName?: string
	/** URL to the profile image */
	imgUrl?: string | null
	/** Current status message */
	status?: string
}

type Account = {
	/** User account details as raw bytes */
	details?: Uint8Array | null
	/** Account signature public key */
	accountSignatureKey?: Uint8Array | null
	/** Account signature */
	accountSignature?: Uint8Array | null
	/** Device signature used for authentication */
	deviceSignature?: Uint8Array | null
}

type SignedKeyPair = {
	/** The generated key pair */
	keyPair: KeyPair
	/** Signature over the key pair */
	signature: Uint8Array
	/** Key identifier */
	keyId: number
	/** Timestamp when this signed key was created */
	timestampS?: number
}

type ProtocolAddress = {
	/** Username or JID */
	name: string
	/** Numeric device ID */
	deviceId: number
}

type SignalIdentity = {
	/** The protocol address identifying this identity */
	identifier: ProtocolAddress
	/** Public identity key bytes */
	identifierKey: Uint8Array
}

type LTHashState = {
	/** Version of the hash state schema */
	version: number
	/** Current hash buffer */
	hash: Buffer
	/** Map of index to MAC value arrays */
	indexValueMap: {
		[indexMacBase64: string]: { valueMac: Uint8Array | Buffer }
	}
}

type SignalCreds = {
	/** The identity key pair */
	readonly signedIdentityKey: KeyPair
	/** The pre-key signed key pair */
	readonly signedPreKey: SignedKeyPair
	/** Registration ID assigned by server */
	readonly registrationId: number
}

type AccountSettings = {
	/** Automatically unarchive chats upon reconnection */
	unarchiveChats: boolean
	/** Default disappearing message settings */
	defaultDisappearingMode?: Pick<any, 'ephemeralExpiration' | 'ephemeralSettingTimestamp'>
}

type SignalKeyStore = {
	/**
	 * Retrieve keys by type and list of ids
	 * @returns A map of id to value or undefined
	 */
	get<T extends keyof SignalDataTypeMap>(
		type: T,
		ids: string[]
	): Awaitable<{ [id: string]: SignalDataTypeMap[T] }>
	/** Store multiple keys
	 * @param data - Map of type to id-value map
	 */
	set(data: SignalDataSet): Awaitable<void>
	/** Clear all stored keys */
	clear?(): Awaitable<void>
}

interface RegistrationOptions {
	/** Full phone number including country code */
	phoneNumber?: string
	/** Country dialing code (e.g., "1" for US) */
	phoneNumberCountryCode: string
	/** National significant number */
	phoneNumberNationalNumber: string
	/** Mobile country code (MCC) */
	phoneNumberMobileCountryCode: string
	/** Mobile network code (MNC) */
	phoneNumberMobileNetworkCode: string
	/** Authentication method */
	method?: 'sms' | 'voice' | 'captcha'
	/** Captcha token if method is 'captcha' */
	captcha?: string
}

export type SslOptions = {
	/** PEM encoded PFX */
	pfx?: string
	/** PEM encoded private key */
	key?: string | string[] | Buffer | Buffer[]
	/** Passphrase for the private key or PFX */
	passphrase?: string
	/** PEM encoded certificate */
	cert?: string | string[] | Buffer | Buffer[]
	/** PEM encoded CA certificates */
	ca?: string | string[] | Buffer | Buffer[]
	/** PEM encoded certificate revocation lists */
	crl?: string | string[]
	/** Cipher suite specification */
	ciphers?: string
	/** If false, do not reject unauthorized certs */
	rejectUnauthorized?: boolean
	/** Minimum TLS version (e.g., 'TLSv1.2') */
	minVersion?: string
	/** Maximum TLS version (e.g., 'TLSv1.3') */
	maxVersion?: string
	/** Verify server identity */
	verifyIdentity?: boolean
}

export type Fingerprint = {
	/** Raw numeric identifier */
	rawId: number
	/** Current index in the fingerprint list */
	currentIndex: number
	/** All device indexes for this identity */
	deviceIndexes: number[]
}

export type AppDataSync = {
	/** Key data for synchronization */
	keyData: Uint8Array
	/** Device fingerprint */
	fingerprint: Fingerprint
	/** Timestamp of this data (ms since epoch) */
	timestamp: Long | number
}

export type SignalDataTypeMap = {
	session: Uint8Array
	'pre-key': KeyPair

	'sender-key': Uint8Array
	'app-state-sync-key': AppDataSync
	'app-state-sync-version': LTHashState
	'sender-key-memory': { [jid: string]: boolean }
}

export type SignalDataSet = {
	[T in keyof SignalDataTypeMap]?: { [id: string]: SignalDataTypeMap[T] | null }
}

export type KeyPair = {
	/** Public half of the key pair */
	public: Uint8Array
	/** Private half of the key pair */
	private: Uint8Array
}

export type sqlData = {
	/** MySQL row constructor name */
	constructor: { name: 'RowDataPacket' }
	/** Parsed row values */
	value?: object[]
}

export interface sqlConnection extends Connection {
	/** Internal flag if connection is closing */
	connection?: { _closing?: boolean }
}

export type MySQLConfig = {
  /** The hostname of the database you are connecting to. (Default: localhost) */
  host?: string
  /** The port number to connect to. (Default: 3306) */
  port?: number
  /** The MySQL user to authenticate as. (Default: root) */
  user?: string
  /** The password of that MySQL user */
  password: string
  /** Alias for the MySQL user password. Makes a bit more sense in a multifactor authentication setup (see "password2" and "password3") */
  password1?: string
  /** 2nd factor authentication password. Mandatory when the authentication policy for the MySQL user account requires an additional authentication method that needs a password. */
  password2?: string
  /** 3rd factor authentication password. Mandatory when the authentication policy for the MySQL user account requires two additional authentication methods and the last one needs a password. */
  password3?: string
  /** Name of the database to use for this connection. (Default: base) */
  database: string
  /** MySql table name. (Default: auth) */
  tableName?: string
  /** Retry the query at each interval if it fails. (Default: 200 ms) */
  retryRequestDelayMs?: number
  /** Connection limit for the pool. (Default: 10) */
  connectionLimit?: number
  /** Maximum attempts if the query fails. (Default: 10) */
  maxtRetries?: number
  /** Maximum number of queued connection requests. (Default: 0 — unlimited) */
  queueLimit?: number
  /** Enable TCP keep-alive on network connections. (Default: true) */
  enableKeepAlive?: boolean
  /** Initial delay before the first TCP keep-alive probe is sent, in milliseconds. (Default: 5000) */
  keepAliveInitialDelay?: number
  /** Session name to identify the connection, allowing multisessions with mysql. */
  session: string
  /** The source IP address to use for TCP connection. */
  localAddress?: string
  /** The path to a unix domain socket to connect to. When used, host and port are ignored. */
  socketPath?: string
  /** Allow connecting to MySQL instances that ask for the old (insecure) authentication method. (Default: false) */
  insecureAuth?: boolean
  /** If your connection is a server. (Default: false) */
  isServer?: boolean
  /** Use the config SSL options. (Default: disabled) */
  ssl?: string | SslOptions
}

export type valueReplacer = {
	data: number[]
	type: string
}

export type valueReviver = {
	data: string
	type: string
}

export type AuthenticationState = {
	creds: AuthenticationCreds
	keys: SignalKeyStore
}

export type AuthenticationCreds = SignalCreds & {
	/** Noise protocol key pair */
	readonly noiseKey: KeyPair
	/** Pairing ephemeral key pair */
	readonly pairingEphemeralKeyPair: KeyPair
	/** Advanced secret key for encryption */
	advSecretKey: string
	/** Your own contact info */
	me?: Contact
	/** Account info block */
	account?: Account
	/** Stored identities for pre-keys */
	signalIdentities?: SignalIdentity[]
	/** Current application sync key ID */
	myAppStateKeyId?: string
	/** First unused pre-key index */
	firstUnuploadedPreKeyId: number
	/** Next pre-key index to generate/use */
	nextPreKeyId: number
	/** Timestamp of last account sync */
	lastAccountSyncTimestamp?: number
	/** Platform identifier (e.g., 'android') */
	platform?: string
	/** Processed history messages */
	processedHistoryMessages: Pick<any, 'key' | 'messageTimestamp'>[]
	/** Counter for account sync operations */
	accountSyncCounter: number
	/** User-specific account settings */
	accountSettings: AccountSettings
	/** Device ID assigned by server */
	deviceId: string
	/** Phone ID associated with this session */
	phoneId: string
	/** Identity identifier buffer */
	identityId: Buffer
	/** Registration completion flag */
	registered: boolean
	/** Backup token buffer */
	backupToken: Buffer
	/** Registration options and state */
	registration: RegistrationOptions
	/** Pairing code if using device pairing */
	pairingCode: string | undefined
	/** Hash of the last property set */
	lastPropHash: string | undefined
	/** Routing information for connections */
	routingInfo: Buffer | undefined
}
