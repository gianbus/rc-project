#Operazioni per creazione certificato:
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -subj '/O=CA Inc./CN=CA.com' -keyout CA.key -out CA.crt

openssl req -out 34.65.247.228.nip.io.csr -newkey rsa:2048 -nodes -keyout 34.65.247.228.nip.io.key -subj "/CN=rc-project/O=rc-project"
openssl x509 -req -sha256 -days 365 -CA CA.crt -CAkey CA.key -set_serial 0 -in 34.65.247.228.nip.io.csr -out 34.65.247.228.nip.io.crt

kubectl create -n istio-system secret tls frescocredentials --key=34.65.247.228.nip.io.key --cert=34.65.247.228.nip.io.crt
