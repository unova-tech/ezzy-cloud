client<llm> MercuryCoder {
  provider openai-generic
  options {
    base_url "https://api.inceptionlabs.ai/v1"
    model "mercury-coder"
    default_role "user"
    api_key env.INCEPTION_API_KEY
  }
}

retry_policy Constant {
  max_retries 3
  strategy {
    type constant_delay
    delay_ms 200
  }
}

retry_policy Exponential {
  max_retries 2
  strategy {
    type exponential_backoff
    delay_ms 300
    multiplier 1.5
    max_delay_ms 10000
  }
}
