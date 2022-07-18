#Operazioni per creazione chiavi CA
openssl req -x509 -sha256 -nodes -days 365 -newkey rsa:2048 -subj '/O=CA Inc./CN=CA.com' -keyout CA.key -out CA.crt
#Operazioni per creazione certificato
openssl req -out {example.com}.csr -newkey rsa:2048 -nodes -keyout {example.com}.key -subj "/CN={your organisation name}/O={your organisation name}"
openssl x509 -req -sha256 -days 365 -CA CA.crt -CAkey CA.key -set_serial 0 -in {example.com}.csr -out {example.com}.crt
#Creazione secret per certificato
kubectl create -n istio-system secret tls frescocredentials --key={example.com}.key --cert={example.com}.crt
