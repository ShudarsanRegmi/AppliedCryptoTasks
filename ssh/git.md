# Setting Up SSH Authentication for GitHub

A concise technical report

This document captures the complete sequence of actions taken to configure SSH authentication for GitHub and to validate that the setup works reliably. The goal was to establish a secure, password-free workflow for Git operations while maintaining clarity and reproducibility.

---

## Objective

To configure an SSH key pair on a local Linux machine, register the public key with GitHub, and validate the setup through a verifiable SSH handshake. This enables a seamless, credential-less workflow for cloning, pushing, and pulling repositories.

---

## 1. Checking for Existing SSH Keys

Before generating new keys, the `.ssh` directory was inspected to determine whether an existing key pair was already present.

```bash
ls ~/.ssh
```

This step provides situational awareness and prevents unintentional overwriting of previous keys.

---

## 2. Generating a New SSH Key Pair

A fresh **ed25519** key pair was generated using the following command:

```c
ssh-keygen -t ed25519 -C "myemail@example.com"
```

This command creates two files:

- a private key (`id_ed25519`), retained locally
    
- a public key (`id_ed25519.pub`), shared with GitHub
    

The email serves as an annotation that makes the key identifiable in retrospective audits.

---

## 3. Starting the SSH Agent

To ensure Git can load and utilize the private key, the SSH agent was initiated in the background:

```
eval "$(ssh-agent -s)"
```

This launches a persistent, in-memory agent designed to hold private keys securely.

---

## 4. Adding the Private Key to the Agent

The newly generated private key was then added to the agent:

```bash
ssh-add ~/.ssh/id_ed25519
```

This step equips the agent to handle authentication attempts without repeatedly asking for passphrases.

---

## 5. Retrieving the Public Key

The public key was extracted in preparation for uploading to GitHub:

```bash
cat ~/.ssh/id_ed25519.pub
```

The resulting line beginning with `ssh-ed25519` was copied in its entirety.

---

## 6. Registering the SSH Key with GitHub

Inside GitHub:

1. Navigate to **Settings**
    
2. Open **SSH and GPG keys**
    
3. Select **New SSH Key**
    
4. Provide a descriptive title
    
5. Paste the copied public key
    
6. Save
    

This binds the local machine’s identity to the GitHub account, enabling cryptographically secure authentication.

<img width="954" height="258" alt="Pasted image 20251207180655" src="https://github.com/user-attachments/assets/1673f263-5da2-4980-be38-a640a9d78522" />


---

## 7. Validating SSH Connectivity

The configuration was verified using GitHub’s SSH test command:

```bash
ssh -T git@github.com
```

<img width="900" height="149" alt="Pasted image 20251207181052" src="https://github.com/user-attachments/assets/85e6d1c2-2087-46ed-ae1e-1d97b61daf82" />


A successful response confirms that the key is recognized and that the secure handshake is functional.  
The message typically reads:

> Hi username. You’ve successfully authenticated, but GitHub does not provide shell access.

This serves as an authoritative validation signal.

---

## 8. Ensuring Git Uses the SSH URL

Repositories should now be cloned using the SSH URL format:

```bash
git clone git@github.com:username/repo.git
```

If an existing repository uses HTTPS, it can be updated:

<img width="1016" height="285" alt="Pasted image 20251207181330" src="https://github.com/user-attachments/assets/1c291fe2-965c-42b9-b8b5-6ad70036b4cf" />


```bash
git remote set-url origin git@github.com:username/repo.git
```

This guarantees that all future Git operations leverage SSH authentication.

---

## Conclusion

The SSH setup for GitHub was executed smoothly through a coherent chain of steps involving key generation, agent configuration, platform registration, and connection validation.  
The final outcome is a streamlined Git workflow that is both secure and frictionless, eliminating the need for repetitive credential entry while preserving strong cryptographic assurance.


