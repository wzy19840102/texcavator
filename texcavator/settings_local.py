# -*- coding: utf-8 -*-

"""
--------------------------------------------------------------------------------
Copyright:	Fons Laan, ILPS-ISLA, University of Amsterdam
Project:	BILAND
Name:		settings_local.py
Version:	0.34
Goal:		local settings for BILAND project on fietstas2

Django admin:	Username: 		aclaan
				E-mail address:	a.c.laan@uva.nl
				Password:		djangobiland

FL-17-Oct-2011: Created
FL-17-Sep-2013: fietstas2 is the new production server for Texcavator
FL-20-Dec-2013: Changed
"""

import os
import sys


PROJECT_ROOT   = os.path.abspath( os.path.dirname( __file__ ) )
PROJECT_PARENT = os.path.dirname( PROJECT_ROOT )
PROJECT_GRANNY = os.path.dirname( PROJECT_PARENT )

sys.path.append( PROJECT_PARENT )

from texcavator.__init__ import DEBUG

if DEBUG == True:
	print >> sys.stderr, "PROJECT_GRANNY:", PROJECT_GRANNY
	print >> sys.stderr, "PROJECT_PARENT:", PROJECT_PARENT
	print >> sys.stderr, "PROJECT_ROOT:",   PROJECT_ROOT
	print >> sys.stderr, "Python version:", sys.version
	print >> sys.stderr, "PYTHONPATH:",     sys.path

ELASTICSEARCH_HOST = "localhost" 
ELASTICSEARCH_PORT = 9200
ES_INDEX = 'kb'
ES_DOCTYPE = 'doc'

XTAS_MAX_CLOUD_DOCS_WARN  =  2500				# servers
XTAS_MAX_CLOUD_DOCS_ERROR = 10000				# servers

QUERY_DATA_DOWNLOAD_ALLOW  = True
QUERY_DATA_DOWNLOAD_DETACH = True		# when True QUERY_DATA_VPYTHON_PATH is needed
QUERY_DATA_DOWNLOAD_PATH   = os.path.join( PROJECT_GRANNY, "BILAND_download/query_data" )
QUERY_DATA_VPYTHON_PATH    = os.path.join( PROJECT_GRANNY, ".virtualenvs/texc" )	# virtual python
QUERY_DATA_CHUNK_SIZE      = 100		# no. of documents from ES with 1 query
QUERY_DATA_DELETE_DATA     = True		# delete query download data
QUERY_DATA_EXPIRE_DAYS     = 1			# delete after one day

# user action logging
ILPS_LOGGING = False				# if True, also uncomment code in base.html

if DEBUG == True:
	print >> sys.stderr, "XTAS_MAX_CLOUD_DOCS_WARN:  %s" % XTAS_MAX_CLOUD_DOCS_WARN
	print >> sys.stderr, "XTAS_MAX_CLOUD_DOCS_ERROR: %s" % XTAS_MAX_CLOUD_DOCS_ERROR

	print >> sys.stderr, "ELASTICSEARCH_HOST:  %s" % ELASTICSEARCH_HOST
	print >> sys.stderr, "ELASTICSEARCH_PORT:  %s" % ELASTICSEARCH_PORT
	print >> sys.stderr, "ES_INDEX:     %s" % ES_INDEX

	print >> sys.stderr, "QUERY_DATA_DOWNLOAD_ALLOW:  %s" % QUERY_DATA_DOWNLOAD_ALLOW
	print >> sys.stderr, "QUERY_DATA_DOWNLOAD_DETACH: %s" % QUERY_DATA_DOWNLOAD_DETACH
	print >> sys.stderr, "QUERY_DATA_DOWNLOAD_PATH:   %s" % QUERY_DATA_DOWNLOAD_PATH
	print >> sys.stderr, "QUERY_DATA_VPYTHON_PATH:    %s" % QUERY_DATA_VPYTHON_PATH
	print >> sys.stderr, "QUERY_DATA_CHUNK_SIZE:      %s" % QUERY_DATA_CHUNK_SIZE
	print >> sys.stderr, "QUERY_DATA_DELETE_DATA:     %s" % QUERY_DATA_DELETE_DATA
	print >> sys.stderr, "QUERY_DATA_EXPIRE_DAYS:     %s" % QUERY_DATA_EXPIRE_DAYS

	print >> sys.stderr, "ILPS_LOGGING:     %s" % ILPS_LOGGING

# database settings for mysql
DATABASE_NAME     = 'test_db_texcavator'
DATABASE_USER     = 'root'
DATABASE_ENGINE   = 'django.db.backends.mysql'
DATABASE_PASSWORD = 'geheim'

DATABASES = {
	'default': {
		'ENGINE'   : DATABASE_ENGINE,		# Add 'postgresql_psycopg2', 'postgresql', 'mysql', 'sqlite3' or 'oracle'.
		'NAME'     : DATABASE_NAME,			# Or path to database file if using sqlite3.
		'USER'     : DATABASE_USER,			# Not used with sqlite3.
		'PASSWORD' : DATABASE_PASSWORD,		# Not used with sqlite3.
		'HOST'     : '',					# Set to empty string for localhost. Not used with sqlite3.
		'PORT'     : '',					# Set to empty string for default. Not used with sqlite3.
	}
}

TEXCAVATOR_DATE_RANGE = "18500101,19901231"

EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025

LOGIN_URL = '/'

# [eof]
