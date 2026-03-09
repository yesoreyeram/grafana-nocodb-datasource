//go:build mage

package main

import (
	"github.com/magefile/mage/mg"
	"github.com/magefile/mage/sh"
)

// Build builds the backend plugin binary.
func Build() error {
	return sh.RunV("go", "build", "-o", "dist/gpx_nocodb_datasource_linux_amd64", "-ldflags", "-w -s", "./pkg")
}

// Test runs Go tests.
func Test() error {
	return sh.RunV("go", "test", "-v", "-cover", "./pkg/...")
}

// Lint runs Go linting.
func Lint() error {
	return sh.RunV("go", "vet", "./pkg/...")
}

// Clean removes build artifacts.
func Clean() error {
	return sh.Rm("dist")
}

// Default target for mage.
var Default = Build

// BuildAll builds both frontend and backend.
func BuildAll() {
	mg.SerialDeps(Build)
}
