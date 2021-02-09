const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { query } = require('./graphql-client')
const { error } = require('./errors')

module.exports = {
  createAccount,
  login
}

const saltRounds = Number(process.env.SALT_ROUNDS) || 10

async function createAccount ({ email, password }) {
  if (await getAccount(email)) throw error(400, 'account already exists')

  const { id: accountId } = await insertAccount({
    email, password: await hashPassword(password)
  })

  return { accountId, token: createJWToken(accountId) }
}

async function login ({ email, password }) {
  const account = await getAccount(email)

  if (!await checkAccountPassword(account, password)) throw error(401, 'wrong email or password')

  return { accountId: account.id, token: createJWToken(account.id) }
}

async function getAccount (email) {
  const { data: { account: [account] } } = await query({
    query: `query($email: String!) {
      account(where: { email: { _eq: $email } }) {
        id, password
      }
    }`,
    variables: { email }
  })

  return account
}

async function insertAccount (accountInput) {
  const { data: { account } } = await query({
    query: `mutation($email: String!, $password: String!) {
      account: insert_account_one(object: { email: $email, password: $password }) {
        id
      }
    }`,
    variables: accountInput
  })

  return account
}

async function checkAccountPassword (account, password) {
  if (!account) return false
  return bcrypt.compare(password, account.password)
}

function hashPassword (password) {
  return bcrypt.hash(password, saltRounds)
}

function createJWToken (accountId) {
  return jwt.sign(
    {
      sub: accountId,
      'https://hasura.io/jwt/claims': {
        'x-hasura-allowed-roles': ['admin'],
        'x-hasura-default-role': 'admin',
        'x-hasura-user-id': accountId
      }
    },
    process.env.JWT_SECRET || 'this is a secret developpement key'
  )
}
