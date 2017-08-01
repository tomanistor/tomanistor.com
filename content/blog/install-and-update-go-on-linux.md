+++
title = "Install and Update Go on Linux"
date = 2017-07-31T21:48:33-07:00
description = "How to install and update Go on a Linux machine."
draft = false
+++

This is the easiest way to install Google's GoLang (Go programming language) on a Linux machine and then perform an update when a new Go version is released.

![GoLang Gopher](/images/blog/golang-gopher-aviator.png)

## Install Go
Installing Go is as simple as downloading a binary archive file and extracting the contents in the right location on your machine.

### 1. Download Go
First, visit the Go [downloads](https://golang.org/dl/) page and download the binary suitable for your machine.

### 2. Extract Archive File
Go into your downloads folder and extract the newly downloaded archive file into the `/usr/local` directory.

```console
$ cd Downloads/
$ tar -C /usr/local -xzf go1.8.linux-amd64.tar.gz
```

Change `go1.8.linux-amd64.tar.gz` to the file you downloaded.

### 3. Add Path
Add `/usr/local/go/bin` to the PATH environment variable.

```console
$ export PATH=$PATH:/usr/local/go/bin
```

### 4. Check Installation
Finally, check the installation by requesting the Go version number. It should print the Go version you have just installed.

```console
$ go version
```

![GoLang Gopher](/images/blog/golang-gopher-dance.png)

## Update Go
Updating Go is as simple as removing the old Go binary on your machine and repeating the install process with a new version of Go.

### 1. Delete Go
Delete the Go binary directory that was created during the installation process.

```console
$ sudo rm -rf /usr/local/go
```

### 2. Download new Go Version
Revisit the Go [downloads](https://golang.org/dl/) page and download the newest Go binary suitable for your machine.

### 3. Extract Archive File
Go into your downloads folder and extract the new archive file into the `/usr/local` directory.

```console
$ cd Downloads/
$ tar -C /usr/local -xzf go1.8.3.linux-amd64.tar.gz
```

Change `go1.8.3.linux-amd64.tar.gz` to the file you downloaded.

### 4. Check the Path
The PATH environment variable doesn't need to be modified again but it doesn't hurt to check that it still contains `/usr/local/go/bin`.

```console
$ echo $PATH | grep "/usr/local/go/bin"
```

### 5. Check the Installation
Lastly, check the installation by requesting the Go version number. It should print the updated Go version you have just freshly installed.

```console
$ go version
```
