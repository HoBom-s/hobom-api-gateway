@Library('hobom-shared-lib') _
hobomPipeline(
  serviceName:    'dev-hobom-api-gateway',
  hostPort:       '9090',
  containerPort:  '9090',
  memory:         '256m',
  cpus:           '0.5',
  envPath:        '/etc/hobom-dev/dev-hobom-api-gateway/.env',
  preBuild:       { sh '''
    UID=$(id -u); GID=$(id -g)
    docker run --rm --user "$UID:$GID" -e HOME=/tmp \
      -v "$PWD":/app -w /app node:20 sh -lc 'npm ci && npm run build'
  ''' },
  smokeCheckPath: '/',
  liveHostPort:   '19090',
  liveEnvPath:    '/etc/hobom-live/live-hobom-api-gateway/.env'
)
