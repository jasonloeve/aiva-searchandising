# Use the official Node.js image as the base image
FROM node:20

# Set the Environment to production
# ENV NODE_ENV=production

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the application dependencies
RUN npm install

# Copy the rest of the application files
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the NestJS application
RUN npx nest build

# Now prune dev dependencies (optional but recommended)
RUN npm prune --production

# Reset NODE_ENV to production for runtime
ENV NODE_ENV=production

# Expose the application port
EXPOSE 3000

# Command to run the application
CMD ["node", "dist/main"]