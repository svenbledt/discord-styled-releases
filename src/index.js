const core = require('@actions/core')
const github = require('@actions/github')
const fetch = require('node-fetch')

export async function getContext () {
  let content

  if (process.env.GITHUB_CONTEXT) {
    // Handle provided release context
    const releaseData = JSON.parse(process.env.GITHUB_CONTEXT)
    content = {
      body: releaseData.body?.length < 1500
        ? releaseData.body
        : releaseData.body?.substring(0, 1500) + ` ([...](${releaseData.html_url}))`,
      tag_name: releaseData.tag_name,
      html_url: releaseData.html_url,
      full_name: process.env.GITHUB_REPOSITORY || github.context.repo.full_name
    }
  } else {
    // Fallback to existing github.context handling
    const context = github.context
    const payload = context.payload
    content = {
      body: payload.release.body?.length < 1500
        ? payload.release.body
        : payload.release.body?.substring(0, 1500) + ` ([...](${payload.release.html_url}))`,
      tag_name: payload.release.tag_name,
      html_url: payload.release.html_url,
      full_name: context.repo.full_name
    }
  }

  return content
}

async function run () {
  try {
    const webhookId = core.getInput('webhook_id')
    const webhookToken = core.getInput('webhook_token')
    const mentionEveryone = core.getInput('mention_everyone') === 'true'

    if (!webhookId || !webhookToken) {
      return core.setFailed(
        'webhook ID or TOKEN are not configured correctly. Verify config file.'
      )
    }

    const content = await getContext()

    const embedMsg = {
      color: 3447003,
      title: `Update ${content.tag_name}`,
      description: content.body,
      url: content.html_url
    }

    const body = {
      content: mentionEveryone ? '@everyone' : '',
      embeds: [embedMsg]
    }

    const url = `https://discord.com/api/webhooks/${core.getInput(
      'webhook_id'
    )}/${core.getInput('webhook_token')}?wait=true`

    fetch(url, {
      method: 'post',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    })
      .then((res) => res.json())
      .then((data) => core.info(JSON.stringify(data)))
      .catch((err) => {
        core.error(err)
        core.setFailed(err.message)
      })
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
