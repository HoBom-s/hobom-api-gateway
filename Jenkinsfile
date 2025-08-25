pipeline {
  agent none

  options {
    timestamps()
    disableConcurrentBuilds()
  }

  environment {
    // Docker Hub
    REGISTRY      = 'docker.io'
    IMAGE_REPO    = 'jjockrod/hobom-system'
    SERVICE_NAME  = 'hobom-api-gateway'
    IMAGE_TAG     = "${REGISTRY}/${IMAGE_REPO}:${SERVICE_NAME}-${env.BUILD_NUMBER}"
    IMAGE_LATEST  = "${REGISTRY}/${IMAGE_REPO}:${SERVICE_NAME}-latest"
    REGISTRY_CRED = 'dockerhub-cred'
    READ_CRED_ID  = 'dockerhub-readonly'

    // Remote server
    APP_NAME      = 'hobom-api-gateway'
    DEPLOY_HOST   = 'ishisha.iptime.org'
    DEPLOY_PORT   = '22223'
    DEPLOY_USER   = 'infra-admin'
    SSH_CRED_ID   = 'deploy-ssh-key'
  }

  stages {
    stage('Build & Push (k3s + Kaniko)') {
      agent {
        kubernetes {
          yaml """
  apiVersion: v1
  kind: Pod
  spec:
    containers:
      - name: node
        image: node:20
        command: ["sh","-lc","sleep 9999999"]
      - name: kaniko
        image: gcr.io/kaniko-project/executor:debug
        command: ["/busybox/sh","-c","sleep 9999999"]
        volumeMounts:
          - name: kaniko-docker-config
            mountPath: /kaniko/.docker
    volumes:
      - name: kaniko-docker-config
        emptyDir: {}
          """
        }
      }
      steps {
        checkout scm
        container('node') {
          sh '''
            set -eux
            node -v
            npm ci
            npm run build
          '''
        }
        container('kaniko') {
          withCredentials([usernamePassword(credentialsId: env.REGISTRY_CRED, usernameVariable: 'REG_USER', passwordVariable: 'REG_PASS')]) {
            sh '''
              set -eux
              AUTH="$(printf '%s' "$REG_USER:$REG_PASS" | base64 -w0 2>/dev/null || printf '%s' "$REG_USER:$REG_PASS" | base64)"
              cat > /kaniko/.docker/config.json <<CFG
  { "auths": { "https://index.docker.io/v1/": { "auth": "$AUTH" } } }
  CFG
              /kaniko/executor \
                --context "$WORKSPACE" \
                --dockerfile "$WORKSPACE/Dockerfile" \
                --destination "${IMAGE_TAG}" \
                --destination "${IMAGE_LATEST}" \
                --cache=false \
                --verbosity=info
            '''
          }
        }
      }
    }

    stage('Deploy to K8s (server YAML under /root)') {
      when { anyOf { branch 'develop'; branch 'main' } }
      agent any
      steps {
        sshagent (credentials: [env.SSH_CRED_ID]) {
          withCredentials([usernamePassword(credentialsId: env.READ_CRED_ID, usernameVariable: 'PULL_USER', passwordVariable: 'PULL_PASS')]) {
            sh '''
    set -eux
    ssh -o StrictHostKeyChecking=no -p "$DEPLOY_PORT" \
      PULL_USER="$PULL_USER" \
      PULL_PASS="$PULL_PASS" \
      "$DEPLOY_USER@$DEPLOY_HOST" bash -s <<'EOS'
    set -euo pipefail

    KCFG="$HOME/.kube/config"
    NS="hobom-api-gateway-latest"
    APP="hobom-api-gateway"
    DIR="/root/k3s/config/${APP}"
    DEPLOY_YAML="${DIR}/${APP}-deployment-dev.yaml"
    HPA_YAML="${DIR}/${APP}-hpa.yaml"

    # namespace
    sudo -E kubectl --kubeconfig "$KCFG" get ns "$NS" >/dev/null 2>&1 || \
    sudo -E kubectl --kubeconfig "$KCFG" create ns "$NS"

    # docker hub pull
    sudo -E kubectl --kubeconfig "$KCFG" -n "$NS" delete secret dockerhub-pull >/dev/null 2>&1 || true
    sudo -E kubectl --kubeconfig "$KCFG" -n "$NS" create secret docker-registry dockerhub-pull \
      --docker-server=index.docker.io \
      --docker-username="$PULL_USER" \
      --docker-password="$PULL_PASS" \
      --docker-email="jjockrod@naver.com"

    sudo -E kubectl --kubeconfig "$KCFG" -n "$NS" patch serviceaccount default \
      -p '{"imagePullSecrets":[{"name":"dockerhub-pull"}]}' --type=merge || true

    # apply deploy
    sudo -E kubectl --kubeconfig "$KCFG" -n "$NS" apply -f "$DEPLOY_YAML"
    sudo -E kubectl --kubeconfig "$KCFG" -n "$NS" rollout status deploy/"$APP" --timeout=180s

    if [ -f "$HPA_YAML" ]; then
      echo "[INFO] Applying HPA: $HPA_YAML"
      sudo -E kubectl --kubeconfig "$KCFG" -n "$NS" apply -f "$HPA_YAML"
      sudo -E kubectl --kubeconfig "$KCFG" -n "$NS" get hpa
    else
      echo "[WARN] HPA yaml not found at $HPA_YAML (skip)"
    fi

    sudo -E kubectl --kubeconfig "$KCFG" -n "$NS" get pods -o wide
    EOS
    '''
          }
        }
      }

  post {
    success {
      echo "✅ Build #${env.BUILD_NUMBER} → pushed ${env.IMAGE_LATEST} & deployed on ${env.DEPLOY_HOST}"
    }
    failure {
      echo "❌ Build failed (${env.BRANCH_NAME})"
    }
  }
}
