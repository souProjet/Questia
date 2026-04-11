#!/usr/bin/env bash
# Build AAB local : Gradle choisissait parfois un JRE 21 sans javac → erreur JAVA_COMPILER.
# Par défaut : JDK 17 Ubuntu/Debian. Surcharge : export JAVA_HOME=/chemin/vers/jdk
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export JAVA_HOME="${JAVA_HOME:-/usr/lib/jvm/java-17-openjdk-amd64}"
cd "$ROOT/apps/mobile/android"
exec ./gradlew bundleRelease "$@"
