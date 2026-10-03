import Docker from "dockerode";
import fs from "fs";

const docker = new Docker();

export interface CreateContainerOptions {
    imageName: string;
    containerName: string;
    containerPort: number;
}

export class DockerService {

    async listContainers() {
        return await docker.listContainers({ all: true });
    }

    async buildImage(
        contextPath: string,
        imageName: string,
        dockerfile = "Dockerfile"
    ): Promise<string[]> {
        const logs: string[] = [];
        const stream = await docker.buildImage(
            {
                context: contextPath,
                src: fs.readdirSync(contextPath).filter(file => file !== '.git' && file !== 'node_modules')
            },
            {
                t: imageName,
                dockerfile
            }
        );

        await new Promise<void>((resolve, reject) => {
            docker.modem.followProgress(
                stream,
                (error) => {
                    if (error) 
                        reject(error);
                    else 
                        resolve();
                },
                (event) => {
                    if (event.stream)
                        logs.push(event.stream.trim());
                    if (event.error)
                        logs.push(event.error);
                }
            );
        });

        return logs;
    }

    async createContainer(options: CreateContainerOptions) {

        const container = await docker.createContainer({
            name: options.containerName,
            Image: options.imageName,
            ExposedPorts: {
                [`${options.containerPort}/tcp`]: {}
            },
            HostConfig: {
                PortBindings: {
                    [`${options.containerPort}/tcp`]: [
                        {
                            // Docker chooses an available host port.
                            HostPort: ""
                        }
                    ]
                }
            }
        });

        return container;
    }

    async startContainer(containerId: string) {
        const container = docker.getContainer(containerId);
        await container.start();
        return container;
    }

    async getContainerPort(
        containerId: string,
        containerPort: number
    ): Promise<number> {
        const container = docker.getContainer(containerId);
        const info = await container.inspect();
        const portInfo =
            info.NetworkSettings?.Ports?.[`${containerPort}/tcp`];
        if (!portInfo || !Array.isArray(portInfo)) {
            throw new Error(
                `Could not determine host port for container ${containerId}`
            );
        }
        const firstPort = portInfo[0];
        if (!firstPort || !firstPort.HostPort) {
            throw new Error(
                `Could not determine host port for container ${containerId}`
            );
        }
        const hostPort = Number(firstPort.HostPort);
        if (!Number.isInteger(hostPort) || hostPort <= 0) {
            throw new Error(
                `Invalid host port for container ${containerId}`
            );
        }
        return hostPort;
    }

    async getContainerLogs(containerId: string): Promise<string> {
        const container = docker.getContainer(containerId);
        const logs = await container.logs({
            stdout: true,
            stderr: true,
            timestamps: true
        });

        return logs.toString();
    }

    async stopContainer(containerId: string) {
        const container = docker.getContainer(containerId);
        await container.stop();
        return true;
    }

    async removeContainer(containerId: string) {
        const container = docker.getContainer(containerId);
        await container.remove();   
        return true;
    }

    async stopAndRemoveContainer(containerId: string) {
        const container = docker.getContainer(containerId);
        try {
            await container.stop();
        } catch {
            // Container may already be stopped.
        }
        await container.remove();
        return true;
    }
}

export default new DockerService();