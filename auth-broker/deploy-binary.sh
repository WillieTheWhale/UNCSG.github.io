#!/usr/bin/env bash
set -euo pipefail

expected_project="bhilberg"
broker_url="https://uncsg-auth-broker-bhilberg.apps.cloudapps.unc.edu"
current_project="$(oc project --short)"

if [[ "${current_project}" != "${expected_project}" ]]; then
  echo "Refusing to deploy: the active OpenShift project is '${current_project}', not '${expected_project}'." >&2
  echo "Run 'oc project ${expected_project}' and try again." >&2
  exit 1
fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
build_dir="$(mktemp -d)"

cleanup() {
  if [[ -n "${build_dir}" && "${build_dir}" == /tmp/* ]]; then
    rm -rf "${build_dir}"
  fi
}
trap cleanup EXIT

cd "${repo_root}"
oc apply -f auth-broker/openshift.yaml

cp package.json package-lock.json tsconfig.json tsconfig.auth-broker.json Dockerfile.auth-broker "${build_dir}/"
cp -R auth-broker "${build_dir}/auth-broker"

oc start-build uncsg-auth-broker --from-dir="${build_dir}" --follow --wait
oc rollout status deployment/uncsg-auth-broker --timeout=180s

curl --fail --silent --show-error "${broker_url}/health"
echo
curl --fail --silent --show-error "${broker_url}/.well-known/oauth-authorization-server"
echo
echo "UNC authentication broker is running at ${broker_url}."
