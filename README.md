# vuei18n-path 🌍🔑

**vuei18n-path** est une extension VSCode pour les développeur en Vue.js, conçue pour gérer vos traductions i18n avec un soupçon de magie ! 🦸‍♂️🦸‍♀️

## ✨ Extractor

Vous avez un tas de fichiers JSON dans votre dossier i18n et vous vous demandez où se cache cette clé de traduction ? Ne vous inquiétez pas, Extractor est là pour extraire les chemins de clés avec une précision chirurgicale. 🎯\
En gros, il va vous permettre de plonger dans vos fichiers et d'en ressortir les chemins de vos traductions comme un détective du code. 🕵️‍♂️

## 🔍 Finder

Vous avez une clé de traduction mais vous avez oublié dans quel fichier elle se cache ? Le Finder est votre super-compagnon de chasse ! Il retrouvera pour vous le fichier exact où se trouve cette clé. ⚡\
Plus besoin de chercher frénétiquement dans des dizaines de fichiers comme un aventurier dans un labyrinthe !

## ⚡ Autocomplétion

Profitez d'une autocomplétion intelligente pour vos clés de traduction directement depuis votre éditeur. Plus besoin de mémoriser chaque chemin : tapez, laissez-vous guider et gagnez en rapidité sur vos implémentations i18n.

## 🚀 Pourquoi l’adopter ?

Avec **vuei18n-path**, vous allez gagner du temps et simplifier la gestion des traductions dans Vue.js, tout en restant serein dans votre développement. 🔥

## 🛠 Installation

Pour installer **vuei18n-path**, suivez ces étapes simples :

1. Clonez le dépôt GitHub :

   ```bash
   git clone https://github.com/podroks/vuei18n-path.git
   ```

2. Accédez au dossier du projet :

   ```bash
   cd vuei18n-path
   ```

3. Installez les dépendances :

   ```bash
   npm install
   ```

4. Installez `vsce` en global si vous ne l'avez pas déjà :

   ```bash
   npm install --global vsce
   ```

5. Générez le package VSIX :

   ```bash
   npm run build
   ```

6. Installez l'extension :

   - **6.1 VS Code :**

     ```bash
     code --install-extension vuei18n-path.vsix
     ```

   - **6.2 Windsurf :**

     ```bash
     windsurf --install-extension vuei18n-path.vsix
     ```

Et voilà ! Votre extension est prête à être utilisée. 🎉
