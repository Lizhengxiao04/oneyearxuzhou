#!/bin/bash

# 创建部署目录
mkdir -p deploy

# 复制必要的文件到部署目录
cp index.html deploy/
cp annual.html deploy/
cp index.js deploy/
cp wrangler.jsonc deploy/
cp package.json deploy/

# 切换到部署目录
cd deploy

# 部署Worker
wrangler deploy