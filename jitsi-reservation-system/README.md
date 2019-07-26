# jitsi-reservation-manager

usefull commands:
chmod -R 777 ./
docker exec -it docker-work_jicofo_1 /bin/bash
curl -v http://172.31.23.14:8067/api/reservation

docker build -t jitsi-reservation-manager-1-2 .
docker save -o <path for generated tar file> <image name>
docker load -i <path to imagedocker stop tar file>
chmod -R 777 ./
# Setting up sources of JitsiMeet on local clean ubuntu 18 LTS

curl -sL https://deb.nodesource.com/setup_10.x 8 | sudo -E bash -

sudo apt-get install -y nodejs

sudo apt-get install gcc g++ make

nodejs -v
v10.13.0

npm -v
6.4.1

git clone https://github.com/jitsi/jitsi-meet.git 15

cd jitsi-meet/

npm install

make

// possibly no 15 and no 8 in commands


&&&&&&&&&&&&&&

update prop to serve our modified app code
https://github.com/jitsi/jitsi-meet/issues/3074



