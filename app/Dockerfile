FROM node:13-alpine
WORKDIR /src/app
COPY . .
RUN npm install 

ENV TZ Europe/Amsterdam
EXPOSE 80
CMD node index.js