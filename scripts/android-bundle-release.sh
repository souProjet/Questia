#!/usr/bin/env bash
# Build AAB local : Gradle choisissait parfois un JRE 21 sans javac → erreur JAVA_COMPILER.
# Par défaut : JDK 17 Ubuntu/Debian. Surcharge : export JAVA_HOME=/chemin/vers/jdk
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"

# SDK Android : `expo prebuild --clean` supprime android/ donc plus de local.properties.
# Gradle exige sdk.dir ou ANDROID_HOME.
detect_android_sdk() {
  if [ -n "${ANDROID_HOME:-}" ] && [ -d "$ANDROID_HOME" ]; then
    printf '%s' "$ANDROID_HOME"
    return 0
  fi
  if [ -n "${ANDROID_SDK_ROOT:-}" ] && [ -d "$ANDROID_SDK_ROOT" ]; then
    printf '%s' "$ANDROID_SDK_ROOT"
    return 0
  fi
  for d in "${HOME}/Android/Sdk" "${HOME}/Library/Android/sdk"; do
    if [ -d "$d" ]; then
      printf '%s' "$d"
      return 0
    fi
  done
  return 1
}

SDK_DIR="$(detect_android_sdk || true)"
if [ -n "$SDK_DIR" ]; then
  export ANDROID_HOME="$SDK_DIR"
fi

ANDROID_DIR="$ROOT/apps/mobile/android"
LOCAL_PROP="$ANDROID_DIR/local.properties"
if [ -d "$ANDROID_DIR" ] && [ -n "${ANDROID_HOME:-}" ]; then
  if [ ! -f "$LOCAL_PROP" ] || ! grep -q '^sdk.dir=' "$LOCAL_PROP" 2>/dev/null; then
    printf 'sdk.dir=%s\n' "$ANDROID_HOME" >"$LOCAL_PROP"
  fi
fi

cd "$ANDROID_DIR"
exec ./gradlew bundleRelease "$@"
