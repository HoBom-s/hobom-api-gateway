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

    stage('Deploy to K8s (server manifests)') {
      when { anyOf { branch 'develop'; branch 'main' } }
      agent any
      steps {
        sshagent (credentials: [env.SSH_CRED_ID]) {
          withCredentials([usernamePassword(credentialsId: env.READ_CRED_ID, usernameVariable: 'PULL_USER', passwordVariable: 'PULL_PASS')]) {
            sh """
    set -eu
    # 비밀 마스킹
    set +x
    ssh -o StrictHostKeyChecking=no -p "${env.DEPLOY_PORT}" \
      "${env.DEPLOY_USER}@${env.DEPLOY_HOST}" \
      APP="${env.APP_NAME}" \
      NS="hobom-api-gateway-latest" \
      PULL_USER="${PULL_USER}" \
      PULL_PASS="${PULL_PASS}" \
      IMAGE="${env.IMAGE_TAG}" \
      bash -s <<'EOS'
    set -euo pipefail

    APP="\${APP:-hobom-api-gateway}"
    NS="\${NS:-hobom-api-gateway-latest}"
    KCFG="\$HOME/.kube/config"

    # 매니페스트 경로: /root 대신 사용자 읽기 가능 경로 사용
    ROOT_DIR="/root/k3s/config/\${APP}"
    USER_DIR="\$HOME/k3s/config/\${APP}"
    mkdir -p "\$USER_DIR"

    DEPLOY_FILE="\${APP}-deployment-dev.yaml"
    HPA_FILE="\${APP}-hpa.yaml"
    DEPLOY_YAML_ROOT="\${ROOT_DIR}/\${DEPLOY_FILE}"
    HPA_YAML_ROOT="\${ROOT_DIR}/\${HPA_FILE}"
    DEPLOY_YAML_USER="\${USER_DIR}/\${DEPLOY_FILE}"
    HPA_YAML_USER="\${USER_DIR}/\${HPA_FILE}"

    # kubeconfig 준비(비번없는 sudo가 되면 자동 준비)
    if [ ! -f "\$KCFG" ]; then
      if sudo -n true 2>/dev/null; then
        sudo mkdir -p "\$(dirname "\$KCFG")"
        sudo cp /etc/rancher/k3s/k3s.yaml "\$KCFG"
        sudo chown "\$USER":"\$USER" "\$KCFG"
        echo "[INFO] kubeconfig prepared at \$KCFG"
      else
        echo "[ERROR] \$KCFG not found and passwordless sudo not available."
        exit 1
      fi
    fi

    # /root → 사용자 디렉토리로 복사 (읽기권한 회피)
    copy_if_needed() {
      local src="\$1" dst="\$2"
      if [ -r "\$dst" ]; then return 0; fi
      if [ -r "\$src" ]; then cp "\$src" "\$dst" && return 0; fi
      if sudo -n test -r "\$src" 2>/dev/null; then
        sudo cp "\$src" "\$dst"
        sudo chown "\$USER":"\$USER" "\$dst"
        return 0
      fi
      return 1
    }
    if ! copy_if_needed "\$DEPLOY_YAML_ROOT" "\$DEPLOY_YAML_USER"; then
      echo "[ERROR] Cannot read \${DEPLOY_YAML_ROOT}. Move manifests out of /root."
      exit 1
    fi
    copy_if_needed "\$HPA_YAML_ROOT" "\$HPA_YAML_USER" || true

    # 네임스페이스
    kubectl --kubeconfig "\$KCFG" get ns "\$NS" >/dev/null 2>&1 || \
    kubectl --kubeconfig "\$KCFG" create ns "\$NS"

    # Pull secret (idempotent) — 비밀 로그 마스킹
    set +x
    kubectl --kubeconfig "\$KCFG" -n "\$NS" create secret docker-registry dockerhub-pull \
      --docker-server=index.docker.io \
      --docker-username="\$PULL_USER" \
      --docker-password="\$PULL_PASS" \
      --docker-email="jjockrod@naver.com" \
      --dry-run=client -o yaml | kubectl --kubeconfig "\$KCFG" -n "\$NS" apply -f -
    set -x

    # 매니페스트 적용
    kubectl --kubeconfig "\$KCFG" -n "\$NS" apply -f "\$DEPLOY_YAML_USER"
    # 디플로이먼트의 SA 이름을 확인(없으면 default)
    SA=\$(kubectl --kubeconfig "\$KCFG" -n "\$NS" get deploy "\$APP" -o jsonpath='{.spec.template.spec.serviceAccountName}')
    if [ -z "\$SA" ]; then SA=default; fi
    # 해당 SA에 pull secret 연결
    kubectl --kubeconfig "\$KCFG" -n "\$NS" patch serviceaccount "\$SA" \
      -p '{"imagePullSecrets":[{"name":"dockerhub-pull"}]}' --type=merge || true

    # 컨테이너 이름 자동 탐지 후, 이번 빌드 태그로 이미지 교체 (강제 롤아웃)
    CN=\$(kubectl --kubeconfig "\$KCFG" -n "\$NS" get deploy "\$APP" -o jsonpath='{.spec.template.spec.containers[0].name}')
    if [ -z "\$CN" ]; then CN="\$APP"; fi
    kubectl --kubeconfig "\$KCFG" -n "\$NS" set image deployment/"\$APP" "\$CN=\$IMAGE" --record

    # (선택) latest 태그를 쓰는 경우 대비 정책 보정
    # kubectl --kubeconfig "\$KCFG" -n "\$NS" patch deploy "\$APP" --type='json' \
    #   -p='[{"op":"replace","path":"/spec/template/spec/containers/0/imagePullPolicy","value":"Always"}]' || true

    # HPA 적용(있을 때만)
    if [ -f "\$HPA_YAML_USER" ]; then
      kubectl --kubeconfig "\$KCFG" -n "\$NS" apply -f "\$HPA_YAML_USER"
      kubectl --kubeconfig "\$KCFG" -n "\$NS" get hpa
    fi

    kubectl --kubeconfig "\$KCFG" -n "\$NS" get pods -o wide
    set -x
    """
          }
        }
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
