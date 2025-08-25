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
              set -eu
              # mask credentials while writing docker config
              set +x
              AUTH="$(printf '%s' "$REG_USER:$REG_PASS" | base64 -w0 2>/dev/null || printf '%s' "$REG_USER:$REG_PASS" | base64)"
              cat > /kaniko/.docker/config.json <<CFG
{ "auths": { "https://index.docker.io/v1/": { "auth": "$AUTH" } } }
CFG
              set -x

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

APP="${APP:-hobom-api-gateway}"
NS="${NS:-hobom-api-gateway-latest}"
KCFG="$HOME/.kube/config"

# 원래 루트 위치와 사용자 위치
ROOT_DIR="/root/k3s/config/${APP}"
USER_DIR="$HOME/k3s/config/${APP}"
mkdir -p "$USER_DIR"

DEPLOY_FILE="${APP}-deployment-dev.yaml"
HPA_FILE="${APP}-hpa.yaml"
DEPLOY_YAML_ROOT="${ROOT_DIR}/${DEPLOY_FILE}"
HPA_YAML_ROOT="${ROOT_DIR}/${HPA_FILE}"
DEPLOY_YAML_USER="${USER_DIR}/${DEPLOY_FILE}"
HPA_YAML_USER="${USER_DIR}/${HPA_FILE}"

# 0) kubeconfig 준비(비번 없는 sudo 가능 시 자동)
if [ ! -f "$KCFG" ]; then
  if sudo -n true 2>/dev/null; then
    sudo mkdir -p "$(dirname "$KCFG")"
    sudo cp /etc/rancher/k3s/k3s.yaml "$KCFG"
    sudo chown "$USER":"$USER" "$KCFG"
    echo "[INFO] kubeconfig prepared at $KCFG"
  else
    echo "[ERROR] $KCFG not found and passwordless sudo not available."
    echo "        Run once on server as root:"
    echo "          mkdir -p /home/$USER/.kube"
    echo "          cp /etc/rancher/k3s/k3s.yaml /home/$USER/.kube/config"
    echo "          chown -R $USER:$USER /home/$USER/.kube"
    exit 1
  fi
fi

# 1) /root 에 있으면 사용자 디렉토리로 복사해 사용(권한 회피)
copy_if_needed() {
  local src="$1" dst="$2"
  if [ -r "$dst" ]; then return 0; fi
  if [ -r "$src" ]; then cp "$src" "$dst" && return 0; fi
  if sudo -n test -r "$src" 2>/dev/null; then
    sudo cp "$src" "$dst"
    sudo chown "$USER":"$USER" "$dst"
    return 0
  fi
  return 1
}
if ! copy_if_needed "$DEPLOY_YAML_ROOT" "$DEPLOY_YAML_USER"; then
  echo "[ERROR] Cannot read ${DEPLOY_YAML_ROOT}. Move manifests out of /root."
  exit 1
fi
copy_if_needed "$HPA_YAML_ROOT" "$HPA_YAML_USER" || true

# 2) 네임스페이스 보장
kubectl --kubeconfig "$KCFG" get ns "$NS" >/dev/null 2>&1 || \
kubectl --kubeconfig "$KCFG" create ns "$NS"

# 3) Docker Hub pull secret (idempotent) — 비밀 로그 마스킹
set +x
kubectl --kubeconfig "$KCFG" -n "$NS" create secret docker-registry dockerhub-pull \
  --docker-server=index.docker.io \
  --docker-username="$PULL_USER" \
  --docker-password="$PULL_PASS" \
  --docker-email="jjockrod@naver.com" \
  --dry-run=client -o yaml | kubectl --kubeconfig "$KCFG" -n "$NS" apply -f -
set -x

# 4) kustomize overlay로 namespace를 강제 통일
KTMP="$(mktemp -d)"
cat > "$KTMP/kustomization.yaml" <<KUS
namespace: $NS
resources:
  - $DEPLOY_YAML_USER
KUS
if [ -f "$HPA_YAML_USER" ]; then
  echo "  - $HPA_YAML_USER" >> "$KTMP/kustomization.yaml"
fi

# apply -k (매니페스트 내부 namespace가 무엇이든 $NS로 통일)
kubectl --kubeconfig "$KCFG" -n "$NS" apply -k "$KTMP"

# 5) 디플로이먼트의 SA에 pull secret 연결
SA=$(kubectl --kubeconfig "$KCFG" -n "$NS" get deploy "$APP" -o jsonpath='{.spec.template.spec.serviceAccountName}')
[ -z "$SA" ] && SA=default
kubectl --kubeconfig "$KCFG" -n "$NS" patch serviceaccount "$SA" \
  -p '{"imagePullSecrets":[{"name":"dockerhub-pull"}]}' --type=merge || true

# 6) 이번 빌드 태그로 이미지 교체 (롤아웃 대기/검증 없음)
CN=$(kubectl --kubeconfig "$KCFG" -n "$NS" get deploy "$APP" -o jsonpath='{.spec.template.spec.containers[0].name}')
[ -z "$CN" ] && CN="$APP"
kubectl --kubeconfig "$KCFG" -n "$NS" set image deployment/"$APP" "$CN=$IMAGE"

# 7) 현황 참고 출력 (비차단)
kubectl --kubeconfig "$KCFG" -n "$NS" get deploy "$APP" \
  -o 'custom-columns=NAME:.metadata.name,UPDATED:.status.updatedReplicas,READY:.status.readyReplicas,AVAILABLE:.status.availableReplicas' || true
kubectl --kubeconfig "$KCFG" -n "$NS" get pods -l app="$APP" -o wide || true
[ -f "$HPA_YAML_USER" ] && kubectl --kubeconfig "$KCFG" -n "$NS" get hpa || true
EOS
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
