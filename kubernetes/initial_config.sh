sudo apt update
#installazione docker
sudo apt install docker.io

#installazione k3s
curl -sfL https://get.k3s.io | sh -s - --no-deploy=traefik --write-kubeconfig-mode 644

#installazione istio
#curl -L https://istio.io/downloadIstio | ISTIO_VERSION=1.14.1 TARGET_ARCH=x86_64 sh -
#cd istio-1.14.1
#export PATH=$PWD/bin:$PATH
#export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
#istioctl install --set profile=demo -y

#sleep 10

#apply bookinfo
#kubectl label namespace default istio-injection=enabled
